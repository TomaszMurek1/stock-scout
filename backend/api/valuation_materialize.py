# api/valuation_materialize.py
from datetime import date, datetime, timedelta, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, cast, Date
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

# Reuse your working preview calculation
from api.valuation_preview import preview_day_value

router = APIRouter(prefix="/api/valuation", tags=["valuation"])


def _first_tx_date(db: Session, portfolio_id: int):
    dt = (
        db.query(func.min(Transaction.timestamp))
        .filter(Transaction.portfolio_id == portfolio_id)
        .scalar()
    )
    return dt.date() if dt else None


def _eod(d: date) -> datetime:
    # end-of-day (no microseconds so comparisons are stable)
    return datetime.combine(d, time(23, 59, 59))


# Local definitions (cash flow signs)
_CASH_IN = {
    TransactionType.DEPOSIT,
    TransactionType.DIVIDEND,
    TransactionType.INTEREST,
}
_CASH_OUT = {
    TransactionType.WITHDRAWAL,
    TransactionType.FEE,
    TransactionType.TAX,
}


@router.post("/materialize-day")
def materialize_day(portfolio_id: int, as_of: date, db: Session = Depends(get_db)):
    # Ensure portfolio exists and get its base currency
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "USD").upper()

    # --- 1) Use the working preview to get securities & cash subtotals in base ccy ---
    preview = preview_day_value(portfolio_id=portfolio_id, as_of=as_of, db=db)

    # Securities subtotal (already in base ccy)
    try:
        by_stock = Decimal(preview["securities"]["total_base"])
    except Exception:
        by_stock = Decimal("0")

    # Cash subtotal (cumulative up to as_of, in base ccy)
    try:
        by_cash = Decimal(preview["cash"]["total_base"])
    except Exception:
        by_cash = Decimal("0")

    total_value = (by_stock + by_cash).quantize(Decimal("0.0001"))

    # --- 2) Net contributions for that specific date (flows on the date only) ---
    # We sum cash-like transactions on that date (no company_id)
    day_flows = (
        db.query(Transaction.transaction_type, Transaction.currency, func.sum(Transaction.quantity).label("amt"))
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.company_id == None)
        .filter(cast(Transaction.timestamp, Date) == as_of)
        .group_by(Transaction.transaction_type, Transaction.currency)
        .all()
    )

    # We’ll reuse preview’s FX logic by calling preview_day_value’s inner helper via a tiny proxy:
    # Since preview_day_value already handled FX elsewhere, to avoid re-implementing FX here,
    # we’ll fall back to a minimal FX approach using your existing FxRate table via a local helper.

    from database.fx import FxRate

    def _fx_to_base_for_currency(src_ccy: str) -> Decimal | None:
        """Minimal FX: try direct (src->base) then inverse (base->src) <= as_of."""
        if not src_ccy:
            return None
        s = src_ccy.upper()
        b = base_ccy
        if s == b:
            return Decimal("1")

        # direct
        row = (
            db.query(FxRate.close)
            .filter(FxRate.base_currency == s, FxRate.quote_currency == b, FxRate.date <= as_of)
            .order_by(FxRate.date.desc())
            .first()
        )
        if row and row[0] is not None:
            return Decimal(str(row[0]))

        # inverse
        inv = (
            db.query(FxRate.close)
            .filter(FxRate.base_currency == b, FxRate.quote_currency == s, FxRate.date <= as_of)
            .order_by(FxRate.date.desc())
            .first()
        )
        if inv and inv[0] not in (None, 0):
            return Decimal("1") / Decimal(str(inv[0]))

        # last resort: look up latest tx rate for that currency on/before as_of
        last_tx = (
            db.query(Transaction.currency_rate)
            .filter(Transaction.portfolio_id == portfolio_id)
            .filter(Transaction.currency == s)
            .filter(Transaction.timestamp <= _eod(as_of))
            .order_by(Transaction.timestamp.desc())
            .first()
        )
        if last_tx and last_tx[0]:
            return Decimal(str(last_tx[0]))

        return None

    net_contributions = Decimal("0")
    for tx_type, ccy, amt in day_flows:
        amt = Decimal(str(amt or 0))
        sign = Decimal("1") if tx_type in _CASH_IN else Decimal("-1")
        rate = _fx_to_base_for_currency(ccy or base_ccy)
        if rate is None:
            # If we can’t price this currency into base, skip this component
            # (prefer missing small component over hard error)
            continue
        net_contributions += sign * amt * rate

    net_contributions = net_contributions.quantize(Decimal("0.0001"))

    # --- 3) Upsert portfolio_valuation_daily ---
    stmt = insert(PortfolioValuationDaily).values(
        portfolio_id=portfolio_id,
        date=as_of,
        total_value=total_value,
        by_stock=by_stock.quantize(Decimal("0.0001")),
        by_etf=Decimal("0"),
        by_bond=Decimal("0"),
        by_crypto=Decimal("0"),
        by_commodity=Decimal("0"),
        by_cash=by_cash.quantize(Decimal("0.0001")),
        net_contributions=net_contributions,
        created_at=datetime.utcnow(),
    ).on_conflict_do_update(
        index_elements=["portfolio_id", "date"],
        set_={
            "total_value": total_value,
            "by_stock": by_stock.quantize(Decimal("0.0001")),
            "by_etf": Decimal("0"),
            "by_bond": Decimal("0"),
            "by_crypto": Decimal("0"),
            "by_commodity": Decimal("0"),
            "by_cash": by_cash.quantize(Decimal("0.0001")),
            "net_contributions": net_contributions,
        },
    )

    db.execute(stmt)
    db.commit()

    return {
        "message": "materialized",
        "portfolio_id": portfolio_id,
        "date": as_of.isoformat(),
        "total_value": str(total_value),
        "by_stock": str(by_stock.quantize(Decimal("0.01"))),
        "by_cash": str(by_cash.quantize(Decimal("0.01"))),
        "net_contributions": str(net_contributions.quantize(Decimal("0.01"))),
    }


@router.post("/materialize-range")
def materialize_range(
    portfolio_id: int,
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end < start")

    first_dt = _first_tx_date(db, portfolio_id)
    if not first_dt:
        return {"portfolio_id": portfolio_id, "points": []}

    cur = max(start, first_dt)
    out = []
    while cur <= end:
        res = materialize_day(portfolio_id=portfolio_id, as_of=cur, db=db)
        out.append({"date": res["date"], "total_value": res["total_value"]})
        cur += timedelta(days=1)

    return {"portfolio_id": portfolio_id, "points": out} 
