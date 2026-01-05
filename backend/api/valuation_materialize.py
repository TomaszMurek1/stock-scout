# api/valuation_materialize.py

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Dict, Iterable
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.account import Account
from database.valuation import PortfolioValuationDaily
from database.company import Company
from database.market import Market
from database.stock_data import StockPriceHistory, CompanyMarketData
from api.valuation_preview import preview_day_value, fx_to_base_for_currency
from services.scan_job_service import create_job, run_scan_task

router = APIRouter()
log = logging.getLogger(__name__)


# ---------- helpers ----------


def delete_range(db: Session, portfolio_id: int, start: date, end: date):
    db.query(PortfolioValuationDaily)\
      .filter(
          PortfolioValuationDaily.portfolio_id == portfolio_id,
          and_(PortfolioValuationDaily.date >= start,
               PortfolioValuationDaily.date <= end)
      ).delete(synchronize_session=False)
    db.commit()


def get_last_pvd_date(db: Session, portfolio_id: int) -> date | None:
    return (
        db.query(func.max(PortfolioValuationDaily.date))
        .filter(PortfolioValuationDaily.portfolio_id == portfolio_id)
        .scalar()
    )


def get_first_tx_date(db: Session, portfolio_id: int) -> date | None:
    """Return the FIRST transaction date (date, not datetime) for a portfolio."""
    dt = (
        db.query(func.min(Transaction.timestamp))
        .filter(Transaction.portfolio_id == portfolio_id)
        .scalar()
    )
    return dt.date() if dt else None

def _calculate_cash_balance(db: Session, portfolio_id: int, as_of: date, base_ccy: str) -> Decimal:
    """
    Calculate actual cash balance by processing ALL cash-affecting transactions and
    revaluing each currency position using FX as of the provided date.
    """
    balances_by_ccy: Dict[str, Decimal] = {}

    def _apply(ccy: str, delta: Decimal):
        balances_by_ccy[ccy] = balances_by_ccy.get(ccy, Decimal("0")) + delta

    cash_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) <= as_of,
        )
        .order_by(Transaction.timestamp)
        .all()
    )

    # Pre-fetch account currencies to handle auto-conversion
    account_currencies = {
        a_id: (ccy or "").upper() 
        for a_id, ccy in db.query(Account.id, Account.currency).filter(Account.portfolio_id == portfolio_id).all()
    }
    
    for tx in cash_transactions:
        tx_ccy = (tx.currency or base_ccy).upper()
        # If transaction account is same as base, we treat it as settled in base 
        # (Auto-conversion at tx time using tx.currency_rate)
        acc_ccy = account_currencies.get(tx.account_id, base_ccy)
        
        should_convert_to_base = (acc_ccy == base_ccy) and (tx_ccy != base_ccy)
        
        if should_convert_to_base:
            # Use transaction rate to convert rigid flow to base
            rate = _dec(tx.currency_rate or 1)
            # Switch bucket to base
            target_ccy = base_ccy
            factor = rate
        else:
            target_ccy = tx_ccy
            factor = Decimal("1")
            
        ttype = tx.transaction_type
        delta = Decimal("0")

        if ttype == TransactionType.DEPOSIT:
            delta = _dec(tx.quantity)
        elif ttype == TransactionType.WITHDRAWAL:
            delta = -_dec(tx.quantity)
        elif ttype == TransactionType.DIVIDEND:
            delta = _dec(tx.quantity)
        elif ttype == TransactionType.INTEREST:
            delta = _dec(tx.quantity)
        elif ttype == TransactionType.FEE:
            delta = -_dec(tx.quantity)
        elif ttype == TransactionType.TAX:
            delta = -_dec(tx.quantity)
        elif ttype == TransactionType.TRANSFER_IN:
            delta = _dec(tx.quantity)
        elif ttype == TransactionType.TRANSFER_OUT:
            delta = -_dec(tx.quantity)
        elif ttype == TransactionType.BUY:
            total_cost = (_dec(tx.quantity) * _dec(tx.price or 0)) + _dec(tx.fee or 0)
            delta = -total_cost
        elif ttype == TransactionType.SELL:
            total_proceeds = (_dec(tx.quantity) * _dec(tx.price or 0)) - _dec(tx.fee or 0)
            delta = total_proceeds
            
        _apply(target_ccy, delta * factor)

    cash_balance_base = Decimal("0")
    for ccy, amt in balances_by_ccy.items():
        if amt == 0:
            continue
        # Use existing logic for FX
        rate = fx_to_base_for_currency(db, as_of, ccy, base_ccy, portfolio_id, None)
        if rate is None:
            log.warning("Missing FX rate for %s on %s; skipping cash component", ccy, as_of)
            continue
        cash_balance_base += amt * rate
    
    return cash_balance_base




# IMPORTANT!
# Call rematerialize_from_tx(...) right after insert/update/delete a transaction.
# Note: this is synchronous and called from other parts of the system.
# We should keep it synchronous or ensure callers don't time out.
# Since it's triggered by transaction updates usually, valid to keep sync for now?
# Or does it trigger 504? If triggered by UI transaction edit, it might.
# But "materialize-day" endpoint acts as manual trigger.
def rematerialize_from_tx(db: Session, portfolio_id: int, tx_day: date):
    today = date.today()
    last_pvd = get_last_pvd_date(db, portfolio_id)

    if last_pvd is None:
        first_tx = get_first_tx_date(db, portfolio_id)
        if not first_tx:
            return  # nothing to do
        start = first_tx
    else:
        start = tx_day if tx_day <= last_pvd else (last_pvd + timedelta(days=1))

    # Overwrite existing rows in [start..today] to fix cash carry-forward
    delete_range(db, portfolio_id, start, today)
    run_materialize_range(portfolio_id=portfolio_id, start=start, end=today, db=db)


def _dec(x) -> Decimal:
    if isinstance(x, Decimal):
        return x
    try:
        return Decimal(str(x))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _prev_by_cash(db: Session, portfolio_id: int, before: date) -> Decimal:
    prev = (
        db.query(PortfolioValuationDaily.by_cash)
        .filter(
            PortfolioValuationDaily.portfolio_id == portfolio_id,
            PortfolioValuationDaily.date < before,
        )
        .order_by(PortfolioValuationDaily.date.desc())
        .first()
    )
    if prev and prev[0] is not None:
        try:
            return Decimal(prev[0])
        except InvalidOperation:
            return Decimal("0")
    return Decimal("0")


def _same_day(ts, d: date) -> bool:
    return ts.date() == d


def _day_net_contributions(
    db: Session, portfolio_id: int, day: date, base_ccy: str
) -> Decimal:
    """
    CORRECTED: Daily net EXTERNAL cash flow in base currency.
    
    Only includes true external cash flows, not internal portfolio movements.
    """
    # ONLY external cash flows that move money in/out of portfolio
    external_types = (
        TransactionType.DEPOSIT,    # Money IN
        TransactionType.WITHDRAWAL, # Money OUT  
        TransactionType.FEE,        # Money OUT (external fees)
        TransactionType.TAX,        # Money OUT (external taxes)
        TransactionType.DIVIDEND,   # Money IN (from external source)
        TransactionType.INTEREST    # Money IN (from external source)
    )

    rows: Iterable[Transaction] = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            and_(
                func.date(Transaction.timestamp) >= day,
                func.date(Transaction.timestamp) <= day,
            ),
            Transaction.transaction_type.in_(external_types),
        )
        .all()
    )

    total = Decimal("0")
    for tx in rows:
        # FX for this transaction: tx.currency -> base_ccy
        if (tx.currency or "").upper() == (base_ccy or "").upper():
            fx = Decimal("1")
        else:
            fx = _dec(tx.currency_rate) if tx.currency_rate is not None else Decimal("1")

        ttype = tx.transaction_type

        if ttype == TransactionType.DEPOSIT:
            total += _dec(tx.quantity) * fx
        elif ttype == TransactionType.WITHDRAWAL:
            total -= _dec(tx.quantity) * fx
        elif ttype == TransactionType.FEE:
            total -= _dec(tx.quantity) * fx
        elif ttype == TransactionType.TAX:
            total -= _dec(tx.quantity) * fx
        elif ttype == TransactionType.DIVIDEND:
            total += _dec(tx.quantity) * fx
        elif ttype == TransactionType.INTEREST:
            total += _dec(tx.quantity) * fx

    return total.quantize(Decimal("0.0001"))


# ---------- Logic ----------

def run_materialize_day(
    portfolio_id: int,
    as_of: date,
    db: Session,
):
    # ensure portfolio exists
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "").upper()


    preview = preview_day_value(portfolio_id=portfolio_id, as_of=as_of, db=db)

    # === 2) Cash via rolling balance (correct for BUY/SELL and other flows) ===
    net_contributions = _day_net_contributions(db, portfolio_id, as_of, base_ccy)
    by_cash = _calculate_cash_balance(db, portfolio_id, as_of, base_ccy)

    # === 3) Build buckets from preview "securities" ===
    lines = preview.get("securities", {}).get("lines", [])
    company_ids = [int(l["company_id"]) for l in lines] if lines else []

    # Default buckets
    bucket = {
        "stock": Decimal("0"),
        "etf": Decimal("0"),
        "bond": Decimal("0"),
        "crypto": Decimal("0"),
        "commodity": Decimal("0"),
    }

    types_map: Dict[int, str] = {}
    has_instr_type = hasattr(Company, "instrument_type")

    if company_ids and has_instr_type:
        # Map company_id -> instrument_type
        types_map = {
            int(cid): (itype or "stock").lower()
            for cid, itype in db.query(Company.company_id, Company.instrument_type)
                                .filter(Company.company_id.in_(company_ids))
                                .all()
        }

        for l in lines:
            cid = int(l["company_id"])
            itype = types_map.get(cid, "stock")
            val_base = _dec(l.get("value_base", "0"))
            if itype in bucket:
                bucket[itype] += val_base
            else:
                bucket["stock"] += val_base
    else:
        # No instrument_type column: treat everything as stock
        for l in lines:
            bucket["stock"] += _dec(l.get("value_base", "0"))

    by_stock = bucket["stock"].quantize(Decimal("0.0001"))
    by_etf = bucket["etf"].quantize(Decimal("0.0001"))
    by_bond = bucket["bond"].quantize(Decimal("0.0001"))
    by_crypto = bucket["crypto"].quantize(Decimal("0.0001"))
    by_commodity = bucket["commodity"].quantize(Decimal("0.0001"))

    # === 4) TOTAL = our cash + buckets (consistent) ===
    total_value = (
        by_cash
        + by_stock
        + by_etf
        + by_bond
        + by_crypto
        + by_commodity
    ).quantize(Decimal("0.0001"))

    # === 5) Upsert into portfolio_valuation_daily ===
    stmt = insert(PortfolioValuationDaily).values(
        portfolio_id=portfolio_id,
        date=as_of,
        total_value=total_value,
        by_stock=by_stock,
        by_etf=by_etf,
        by_bond=by_bond,
        by_crypto=by_crypto,
        by_commodity=by_commodity,
        by_cash=by_cash,
        net_contributions=net_contributions,
        created_at=datetime.utcnow(),
    ).on_conflict_do_update(
        index_elements=["portfolio_id", "date"],
        set_={
            "total_value": total_value,
            "by_stock": by_stock,
            "by_etf": by_etf,
            "by_bond": by_bond,
            "by_crypto": by_crypto,
            "by_commodity": by_commodity,
            "by_cash": by_cash,
            "net_contributions": net_contributions,
            # keep created_at as the original insertion time
        },
    )

    db.execute(stmt)
    db.commit()

    return {
        "message": "materialized",
        "portfolio_id": portfolio_id,
        "date": as_of.isoformat(),
        "total_value": str(total_value),
        "by_stock": str(by_stock),
        "by_etf": str(by_etf),
        "by_bond": str(by_bond),
        "by_crypto": str(by_crypto),
        "by_commodity": str(by_commodity),
        "by_cash": str(by_cash),
        "net_contributions": str(net_contributions),
    }


def run_materialize_range(
    portfolio_id: int,
    start: date,
    end: date,
    db: Session,
):
    if end < start:
        raise ValueError("end < start")

    first_dt = get_first_tx_date(db, portfolio_id)
    if not first_dt:
        # no transactions at all
        return {"portfolio_id": portfolio_id, "points": []}

    # Effective start is at least the first transaction
    actual_start = max(start, first_dt)
    
    # If the requested range is entirely before the first transaction
    if actual_start > end:
         return {"portfolio_id": portfolio_id, "points": []}

    # 1. OPTIMIZATION: Calculate state (Cash + Holdings) at (actual_start - 1_day)
    # This is the "Base State" we will incrementally update.
    base_date = actual_start - timedelta(days=1)
    
    current_cash, current_positions = _get_portfolio_state_at(db, portfolio_id, base_date)
    
    # ensure portfolio exists to get base currency
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "USD").upper()
    
    # 2. Fetch ALL transactions in the range [actual_start, end]
    range_txs = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) >= actual_start,
            func.date(Transaction.timestamp) <= end
        )
        .order_by(Transaction.timestamp)
        .all()
    )
    
    # Group transactions by date
    from collections import defaultdict
    txs_by_date = defaultdict(list)
    for tx in range_txs:
        txs_by_date[tx.timestamp.date()].append(tx)
        
    out = []
    
    # 3. Iterate day-by-day
    cur = actual_start
    while cur <= end:
        # A. Update State with today's transactions
        todays_txs = txs_by_date.get(cur, [])
        
        daily_net_contrib = Decimal("0")
        
        # Pre-fetch account currencies (cached map)
        account_currencies = {
            a_id: (ccy or "").upper() 
            for a_id, ccy in db.query(Account.id, Account.currency).filter(Account.portfolio_id == portfolio_id).all()
        }

        for tx in todays_txs:
            # -- Update Cash --
            tx_ccy = (tx.currency or base_ccy).upper()
            acc_ccy = account_currencies.get(tx.account_id, base_ccy)
            should_convert_to_base = (acc_ccy == base_ccy) and (tx_ccy != base_ccy)
            
            rate = _dec(tx.currency_rate or 1)
            
            if should_convert_to_base:
                target_ccy = base_ccy
                factor = rate
            else:
                target_ccy = tx_ccy
                factor = Decimal("1")
                
            ttype = tx.transaction_type
            delta = Decimal("0")
            
            # Cash impact
            if ttype == TransactionType.DEPOSIT:
                delta = _dec(tx.quantity)
            elif ttype == TransactionType.WITHDRAWAL:
                delta = -_dec(tx.quantity)
            elif ttype == TransactionType.DIVIDEND:
                delta = _dec(tx.quantity)
            elif ttype == TransactionType.INTEREST:
                delta = _dec(tx.quantity)
            elif ttype == TransactionType.FEE:
                delta = -_dec(tx.quantity)
            elif ttype == TransactionType.TAX:
                delta = -_dec(tx.quantity)
            elif ttype == TransactionType.TRANSFER_IN:
                delta = _dec(tx.quantity)
            elif ttype == TransactionType.TRANSFER_OUT:
                delta = -_dec(tx.quantity)
            elif ttype == TransactionType.BUY:
                total_cost = (_dec(tx.quantity) * _dec(tx.price or 0)) + _dec(tx.fee or 0)
                delta = -total_cost
            elif ttype == TransactionType.SELL:
                total_proceeds = (_dec(tx.quantity) * _dec(tx.price or 0)) - _dec(tx.fee or 0)
                delta = total_proceeds
            
            current_cash[target_ccy] = current_cash.get(target_ccy, Decimal("0")) + (delta * factor)

            # -- Update Positions --
            if tx.company_id:
                cid = tx.company_id
                if ttype == TransactionType.BUY:
                    current_positions[cid] = current_positions.get(cid, Decimal("0")) + _dec(tx.quantity)
                elif ttype == TransactionType.SELL:
                     current_positions[cid] = current_positions.get(cid, Decimal("0")) - _dec(tx.quantity)
                elif ttype == TransactionType.TRANSFER_IN:
                     current_positions[cid] = current_positions.get(cid, Decimal("0")) + _dec(tx.quantity)
                elif ttype == TransactionType.TRANSFER_OUT:
                     current_positions[cid] = current_positions.get(cid, Decimal("0")) - _dec(tx.quantity)
            
            # -- Net Contributions (External Flow) --
            if ttype in (TransactionType.DEPOSIT, TransactionType.WITHDRAWAL, TransactionType.FEE, 
                         TransactionType.TAX, TransactionType.DIVIDEND, TransactionType.INTEREST):
                 
                flux_fx = Decimal("1")
                if tx_ccy != base_ccy:
                     flux_fx = _dec(tx.currency_rate) if tx.currency_rate is not None else Decimal("1")
                
                amount = _dec(tx.quantity)
                val = amount * flux_fx
                
                if ttype in (TransactionType.WITHDRAWAL, TransactionType.FEE, TransactionType.TAX):
                    daily_net_contrib -= val
                else:
                    daily_net_contrib += val

        # B. Calculate Valuation
        
        # 1. Cash Value in Base
        total_cash_val = Decimal("0")
        for ccy, amt in current_cash.items():
            if amt == 0: continue
            rate = fx_to_base_for_currency(db, cur, ccy, base_ccy, portfolio_id, None)
            if rate:
                total_cash_val += amt * rate
        
        # 2. Securities Value
        active_cids = [c for c, q in current_positions.items() if abs(q) > Decimal("1e-9")]
        
        valuation_data = _get_companies_valuation(db, cur, active_cids, base_ccy, portfolio_id)
        
        bucket = {
            "stock": Decimal("0"),
            "etf": Decimal("0"),
            "bond": Decimal("0"),
            "crypto": Decimal("0"),
            "commodity": Decimal("0"),
        }
        
        for cid in active_cids:
            qty = current_positions[cid]
            info = valuation_data.get(cid)
            if not info:
                 continue
            
            price = info["price"]
            if price is None:
                continue

            # Value in instrument currency
            val_inst = qty * price
            
            # Convert to base
            fx = info["fx"]
            val_base = val_inst * fx
            
            itype = info["type"]
            if itype in bucket:
                bucket[itype] += val_base
            else:
                bucket["stock"] += val_base

        # Quantize results
        by_stock = bucket["stock"].quantize(Decimal("0.0001"))
        by_etf = bucket["etf"].quantize(Decimal("0.0001"))
        by_bond = bucket["bond"].quantize(Decimal("0.0001"))
        by_crypto = bucket["crypto"].quantize(Decimal("0.0001"))
        by_commodity = bucket["commodity"].quantize(Decimal("0.0001"))
        by_cash = total_cash_val.quantize(Decimal("0.0001"))
        net_contrib = daily_net_contrib.quantize(Decimal("0.0001"))

        total_value = (by_cash + by_stock + by_etf + by_bond + by_crypto + by_commodity).quantize(Decimal("0.0001"))

        # C. Upsert to DB
        stmt = insert(PortfolioValuationDaily).values(
            portfolio_id=portfolio_id,
            date=cur,
            total_value=total_value,
            by_stock=by_stock,
            by_etf=by_etf,
            by_bond=by_bond,
            by_crypto=by_crypto,
            by_commodity=by_commodity,
            by_cash=by_cash,
            net_contributions=net_contrib,
            created_at=datetime.utcnow(),
        ).on_conflict_do_update(
            index_elements=["portfolio_id", "date"],
            set_={
                "total_value": total_value,
                "by_stock": by_stock,
                "by_etf": by_etf,
                "by_bond": by_bond,
                "by_crypto": by_crypto,
                "by_commodity": by_commodity,
                "by_cash": by_cash,
                "net_contributions": net_contrib,
            },
        )
        db.execute(stmt)
        
        out.append({
            "date": cur.isoformat(),
            "total_value": str(total_value),
            "by_stock": str(by_stock),
            "by_etf": str(by_etf),
            "by_bond": str(by_bond),
            "by_crypto": str(by_crypto),
            "by_commodity": str(by_commodity),
            "by_cash": str(by_cash),
            "net_contributions": str(net_contrib),
        })

        cur += timedelta(days=1)

    db.commit()
    return {"portfolio_id": portfolio_id, "points": out}


def _get_portfolio_state_at(db: Session, portfolio_id: int, as_of: date):
    """
    Returns (cash_dict, positions_dict) at end of as_of.
    Uses generic 'since beginning' approach but only called once.
    """
    cash_map = {} # {ccy: Decimal}
    pos_map = {}  # {company_id: Decimal}
    
    # Fetch ALL txs <= as_of
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) <= as_of
        )
        .order_by(Transaction.timestamp)
        .all()
    )
    
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    base_ccy = (pf.currency or "USD").upper()
    
    account_currencies = {
        a_id: (ccy or "").upper() 
        for a_id, ccy in db.query(Account.id, Account.currency).filter(Account.portfolio_id == portfolio_id).all()
    }

    for tx in txs:
         # -- Cash --
        tx_ccy = (tx.currency or base_ccy).upper()
        acc_ccy = account_currencies.get(tx.account_id, base_ccy)
        should_convert_to_base = (acc_ccy == base_ccy) and (tx_ccy != base_ccy)
        
        rate = _dec(tx.currency_rate or 1)
        
        if should_convert_to_base:
            target_ccy = base_ccy
            factor = rate
        else:
            target_ccy = tx_ccy
            factor = Decimal("1")
            
        ttype = tx.transaction_type
        delta = Decimal("0")
        
        if ttype == TransactionType.DEPOSIT: delta = _dec(tx.quantity)
        elif ttype == TransactionType.WITHDRAWAL: delta = -_dec(tx.quantity)
        elif ttype == TransactionType.DIVIDEND: delta = _dec(tx.quantity)
        elif ttype == TransactionType.INTEREST: delta = _dec(tx.quantity)
        elif ttype == TransactionType.FEE: delta = -_dec(tx.quantity)
        elif ttype == TransactionType.TAX: delta = -_dec(tx.quantity)
        elif ttype == TransactionType.TRANSFER_IN: delta = _dec(tx.quantity)
        elif ttype == TransactionType.TRANSFER_OUT: delta = -_dec(tx.quantity)
        elif ttype == TransactionType.BUY:
            total_cost = (_dec(tx.quantity) * _dec(tx.price or 0)) + _dec(tx.fee or 0)
            delta = -total_cost
        elif ttype == TransactionType.SELL:
            total_proceeds = (_dec(tx.quantity) * _dec(tx.price or 0)) - _dec(tx.fee or 0)
            delta = total_proceeds
        
        cash_map[target_ccy] = cash_map.get(target_ccy, Decimal("0")) + (delta * factor)
        
        # -- Positions --
        if tx.company_id:
            cid = tx.company_id
            q = _dec(tx.quantity)
            if ttype == TransactionType.BUY:
                pos_map[cid] = pos_map.get(cid, Decimal("0")) + q
            elif ttype == TransactionType.SELL:
                pos_map[cid] = pos_map.get(cid, Decimal("0")) - q
            elif ttype == TransactionType.TRANSFER_IN:
                pos_map[cid] = pos_map.get(cid, Decimal("0")) + q
            elif ttype == TransactionType.TRANSFER_OUT:
                pos_map[cid] = pos_map.get(cid, Decimal("0")) - q
                
    return cash_map, pos_map

def _get_companies_valuation(db: Session, as_of: date, company_ids: list[int], base_ccy: str, portfolio_id: int):
    """
    Returns {company_id: {price: Decimal, fx: Decimal, type: str}}
    Optimized: Batch fetch prices and FX.
    """
    if not company_ids:
        return {}
        
    result = {}
    
    has_instr = hasattr(Company, "instrument_type")
    
    # 1. Fetch Company Metadata (Currency, Type)
    if has_instr:
        data = (
            db.query(Company.company_id, Company.instrument_type, Market.currency)
            .join(Market, Market.market_id == Company.market_id)
            .filter(Company.company_id.in_(company_ids))
            .all()
        )
    else:
        data = (
            db.query(Company.company_id, Market.currency)
            .join(Market, Market.market_id == Company.market_id)
            .filter(Company.company_id.in_(company_ids))
            .all()
        )
        
    # 2. Batch Fetch Prices (Closest <= as_of)
    # This is tricky in SQL for "closest date per group".
    # Strategy: Fetch history in range [as_of - 5 days, as_of] for these companies
    # and resolve in memory. This avoids N queries.
    min_date = as_of - timedelta(days=7) # Safety window
    
    raw_prices = (
        db.query(StockPriceHistory.company_id, StockPriceHistory.date, StockPriceHistory.close)
        .filter(
            StockPriceHistory.company_id.in_(company_ids),
            StockPriceHistory.date >= min_date,
            StockPriceHistory.date <= as_of
        )
        .order_by(StockPriceHistory.company_id, StockPriceHistory.date.desc())
        .all()
    )
    
    price_map = {} # cid -> price
    for cid, dt, close in raw_prices:
        if cid not in price_map and close is not None:
             price_map[cid] = Decimal(str(close))
             
    # Fallback: CompanyMarketData (Current Price)
    # Only if we miss history (e.g. today is holiday or brand new data)
    missing_price_cids = [cid for cid in company_ids if cid not in price_map]
    if missing_price_cids:
        cmd_rows = (
            db.query(CompanyMarketData.company_id, CompanyMarketData.current_price)
            .filter(CompanyMarketData.company_id.in_(missing_price_cids))
            .all()
        )
        for cid, cp in cmd_rows:
            if cp is not None:
                price_map[cid] = Decimal(str(cp))

    # 3. Batch Fetch FX Rates
    # Collect needed currencies
    inst_currencies = set()
    comp_info_map = {} # cid -> (itype, ccy)
    
    for row in data:
        if has_instr:
            cid, itype, mkt_ccy = row
        else:
            cid, mkt_ccy = row
            itype = "stock"
            
        ccy = (mkt_ccy or base_ccy).upper()
        inst_currencies.add(ccy)
        comp_info_map[cid] = (itype, ccy)
        
    # Fetch rates for all unique instrument currencies -> Base
    fx_map = {} # ccy -> rate
    # Use existing helper or bulk logic? 
    # Let's reuse the logic: if ccy == base, 1.0. Else fetch.
    # Since number of currencies is small (USD, EUR...), loop queries are acceptable compare to N companies.
    # But let's be safe and use `get_fx_rates_batch_for_date` if possible or just loop.
    
    from services.fx.fx_rate_helper import get_fx_rate_for_date
    for ccy in inst_currencies:
        if ccy == base_ccy:
            fx_map[ccy] = Decimal("1.0")
        else:
            r = get_fx_rate_for_date(db, ccy, base_ccy, as_of)
            fx_map[ccy] = Decimal(str(r)) if r is not None else Decimal("0")

    # 4. Assembly
    for cid in company_ids:
        if cid not in comp_info_map:
            continue
            
        itype, ccy = comp_info_map[cid]
        price = price_map.get(cid)
        rate = fx_map.get(ccy, Decimal("0"))
        
        result[cid] = {
            "price": price, # Can be None
            "fx": rate,
            "type": (itype or "stock").lower()
        }
        
    return result


# ---------- endpoints ----------


@router.post("/materialize-day", operation_id="valuation_materializeDay")
def materialize_day(
    background_tasks: BackgroundTasks,
    portfolio_id: int,
    as_of: date,
    db: Session = Depends(get_db),
):
    job = create_job(db, "materialize_day")
    def task_wrapper(db_session: Session):
        return run_materialize_day(portfolio_id, as_of, db_session)
    
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}


@router.post("/materialize-range", operation_id="valuation_materializeRange")
def materialize_range(
    background_tasks: BackgroundTasks,
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    job = create_job(db, "materialize_range")
    def task_wrapper(db_session: Session):
        return run_materialize_range(portfolio_id, start, end, db_session)
    
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}
