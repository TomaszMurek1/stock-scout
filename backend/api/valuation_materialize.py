# api/valuation_materialize.py

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Dict, Iterable

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.valuation import PortfolioValuationDaily
from database.company import Company
from api.valuation_preview import preview_day_value, fx_to_base_for_currency

router = APIRouter()


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

    for tx in cash_transactions:
        ccy = (tx.currency or base_ccy).upper()
        ttype = tx.transaction_type

        if ttype == TransactionType.DEPOSIT:
            _apply(ccy, _dec(tx.quantity))
        elif ttype == TransactionType.WITHDRAWAL:
            _apply(ccy, -_dec(tx.quantity))
        elif ttype == TransactionType.DIVIDEND:
            _apply(ccy, _dec(tx.quantity))
        elif ttype == TransactionType.INTEREST:
            _apply(ccy, _dec(tx.quantity))
        elif ttype == TransactionType.FEE:
            _apply(ccy, -_dec(tx.quantity))
        elif ttype == TransactionType.TAX:
            _apply(ccy, -_dec(tx.quantity))
        elif ttype == TransactionType.TRANSFER_IN:
            _apply(ccy, _dec(tx.quantity))
        elif ttype == TransactionType.TRANSFER_OUT:
            _apply(ccy, -_dec(tx.quantity))
        elif ttype == TransactionType.BUY:
            total_cost = (_dec(tx.quantity) * _dec(tx.price or 0)) + _dec(tx.fee or 0)
            _apply(ccy, -total_cost)
        elif ttype == TransactionType.SELL:
            total_proceeds = (_dec(tx.quantity) * _dec(tx.price or 0)) - _dec(tx.fee or 0)
            _apply(ccy, total_proceeds)

    cash_balance_base = Decimal("0")
    for ccy, amt in balances_by_ccy.items():
        if amt == 0:
            continue
        rate = fx_to_base_for_currency(db, as_of, ccy, base_ccy, portfolio_id, None)
        if rate is None:
            log.warning("Missing FX rate for %s on %s; skipping cash component", ccy, as_of)
            continue
        cash_balance_base += amt * rate

    return cash_balance_base




# IMPORTANT!
# Call rematerialize_from_tx(...) right after insert/update/delete a transaction.
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
    materialize_range(portfolio_id=portfolio_id, start=start, end=today, db=db)


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


# ---------- endpoints ----------


@router.post("/materialize-day", operation_id="valuation_materializeDay")
def materialize_day(
    portfolio_id: int,
    as_of: date,
    db: Session = Depends(get_db),
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


@router.post("/materialize-range", operation_id="valuation_materializeRange")
def materialize_range(
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end < start")

    first_dt = get_first_tx_date(db, portfolio_id)
    if not first_dt:
        # no transactions at all
        return {"portfolio_id": portfolio_id, "points": []}

    # both are 'date', safe to compare
    cur = max(start, first_dt)
    out = []
    while cur <= end:
        res = materialize_day(portfolio_id=portfolio_id, as_of=cur, db=db)
        out.append(
            {
                "date": res["date"],
                "total_value": res["total_value"],
                "by_stock": res["by_stock"],
                "by_etf": res["by_etf"],
                "by_bond": res["by_bond"],
                "by_crypto": res["by_crypto"],
                "by_commodity": res["by_commodity"],
                "by_cash": res["by_cash"],
                "net_contributions": res["net_contributions"],
            }
        )
        cur += timedelta(days=1)

    return {"portfolio_id": portfolio_id, "points": out}
