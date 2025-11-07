# api/account_snapshot.py  (append this)

from database.base import get_db
from database.account import Account
from database.portfolio import Portfolio, Transaction, TransactionType

from database.company import Company
from database.stock_data import StockPriceHistory
from api.valuation_preview import fx_to_base_for_currency

from sqlalchemy.orm import joinedload
from sqlalchemy import func
from datetime import datetime, date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query

from database.position import Position

# same sets we used for account cash math
CASH_IN  = {TransactionType.DEPOSIT, TransactionType.DIVIDEND, TransactionType.INTEREST, TransactionType.TRANSFER_IN}
CASH_OUT = {TransactionType.WITHDRAWAL, TransactionType.FEE, TransactionType.TAX, TransactionType.TRANSFER_OUT}

def _latest_close_as_of(db, company_id: int, as_of: date) -> Decimal | None:
    row = (
        db.query(StockPriceHistory.close)
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.date <= as_of)
        .order_by(StockPriceHistory.date.desc())
        .first()
    )
    return Decimal(str(row[0])) if row and row[0] is not None else None

def _snapshot_for_account(db, account: Account, base_ccy: str, as_of: date) -> dict:
    cutoff = datetime.combine(as_of, datetime.max.time()).replace(microsecond=0)

    # --- CASH (company_id is NULL) ---
    cash_rows = (
        db.query(
            Transaction.transaction_type,
            Transaction.currency,
            func.sum(Transaction.quantity).label("amt"),
        )
        .filter(Transaction.account_id == account.id)
        .filter(Transaction.company_id == None)
        .filter(Transaction.timestamp <= cutoff)
        .group_by(Transaction.transaction_type, Transaction.currency)
        .all()
    )

    cash_components = []
    cash_total_base = Decimal("0")

    for tx_type, ccy, amt in cash_rows:
        amt = Decimal(str(amt or 0))
        if tx_type in CASH_IN:
            signed = amt
        elif tx_type in CASH_OUT:
            signed = -amt
        else:
            continue

        ccy = (ccy or base_ccy).upper()
        rate = fx_to_base_for_currency(db, as_of, ccy, base_ccy, account.portfolio_id, None)
        if rate is None:
            continue

        base_amt = signed * rate
        cash_total_base += base_amt
        cash_components.append({
            "type": tx_type.value if hasattr(tx_type, "value") else str(tx_type),
            "currency": ccy,
            "amount": str(amt),
            "fx_to_base": str(rate),
            "amount_base": str(base_amt),
        })

    # --- SECURITIES (positions table) ---
    pos_rows = (
        db.query(Position)
        .options(joinedload(Position.company).joinedload(Company.market))
        .filter(Position.account_id == account.id)
        .all()
    )

    sec_lines = []
    sec_total_base = Decimal("0")

    for p in pos_rows:
        qty = Decimal(str(p.quantity or 0))
        if qty == Decimal("0"):
            continue

        inst_ccy = (
            p.company.market.currency.upper()
            if p.company and p.company.market else base_ccy
        )
        px = _latest_close_as_of(db, p.company_id, as_of)
        if px is None:
            continue

        fx = fx_to_base_for_currency(db, as_of, inst_ccy, base_ccy, account.portfolio_id, p.company_id)
        if fx is None:
            continue

        base_val = qty * px * fx
        sec_total_base += base_val

        sec_lines.append({
            "company_id": p.company_id,
            "qty": str(qty),
            "price_inst": str(px),
            "inst_ccy": inst_ccy,
            "fx_to_base": str(fx),
            "value_base": str(base_val),
        })

    total_base = cash_total_base + sec_total_base

    return {
        "account_id": account.id,
        "name": account.name,
        "account_type": account.account_type,
        "currency_hint": (account.currency or "").upper() if account.currency else None,
        "totals": {
            "total_base": str(total_base),
            "cash_base": str(cash_total_base),
            "securities_base": str(sec_total_base),
        },
        "cash": {
            "total_base": str(cash_total_base),
            "components": cash_components,
        },
        "securities": {
            "total_base": str(sec_total_base),
            "lines": sec_lines,
        },
    }

router = APIRouter(prefix="/api/snapshot", tags=["valuation-debug"])

@router.get("/by-portfolio/{portfolio_id}")
def portfolio_accounts_snapshot(
    portfolio_id: int,
    as_of: date = Query(default=date.today(), description="YYYY-MM-DD"),
    db=Depends(get_db),
):
    # Load portfolio + accounts
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "PLN").upper()

    accounts = (
        db.query(Account)
        .filter(Account.portfolio_id == portfolio_id)
        .order_by(Account.name)
        .all()
    )
    if not accounts:
        return {
            "portfolio_id": portfolio_id,
            "base_currency": base_ccy,
            "as_of": as_of.isoformat(),
            "accounts": [],
            "totals": {
                "total_base": "0",
                "cash_base": "0",
                "securities_base": "0",
            },
        }

    # Build per-account snapshots and aggregate
    agg_total = Decimal("0")
    agg_cash = Decimal("0")
    agg_secs = Decimal("0")

    snapshots = []
    for acc in accounts:
        snap = _snapshot_for_account(db, acc, base_ccy, as_of)
        snapshots.append(snap)
        agg_total += Decimal(snap["totals"]["total_base"])
        agg_cash  += Decimal(snap["totals"]["cash_base"])
        agg_secs  += Decimal(snap["totals"]["securities_base"])

    return {
        "portfolio_id": portfolio_id,
        "base_currency": base_ccy,
        "as_of": as_of.isoformat(),
        "accounts": snapshots,
        "totals": {
            "total_base": str(agg_total),
            "cash_base": str(agg_cash),
            "securities_base": str(agg_secs),
        },
    }
