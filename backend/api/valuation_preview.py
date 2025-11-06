from datetime import datetime, date, time
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.company import Company
from database.market import Market
from database.stock_data import StockPriceHistory
from database.fx import FxRate

router = APIRouter(prefix="/api/valuation", tags=["valuation"])

def _eod(d: date) -> datetime:
    return datetime.combine(d, time.max.replace(microsecond=0))

@router.get("/preview-day")
def preview_day_value(
    portfolio_id: int,
    as_of: date = Query(..., description="Date to value at (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    # 1) Portfolio + base currency
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "USD").upper()

    cutoff = _eod(as_of)

    # 2) Holdings as-of (sum BUY - SELL)
    qty_expr = func.coalesce(
        func.sum(
            case(
                (Transaction.transaction_type == TransactionType.BUY,  Transaction.quantity),
                (Transaction.transaction_type == TransactionType.SELL, -Transaction.quantity),
                else_=0,
            )
        ),
        0,
    )

    rows = (
        db.query(
            Transaction.company_id.label("company_id"),
            qty_expr.label("qty"),
            Market.currency.label("inst_ccy"),
        )
        .join(Company, Company.company_id == Transaction.company_id)
        .join(Market, Market.market_id == Company.market_id)
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.timestamp <= cutoff)
        .group_by(Transaction.company_id, Market.currency)
        .having(qty_expr != 0)
        .all()
    )

    if not rows:
        return {
            "portfolio_id": portfolio_id,
            "base_currency": base_ccy,
            "as_of": as_of.isoformat(),
            "total": "0.00",
            "lines": [],
        }

    # --- helpers: latest price and robust FX (<= as_of, inverse, tx-rate fallback) ---

    def latest_price(company_id: int) -> Decimal | None:
        row = (
            db.query(StockPriceHistory.close)
            .filter(StockPriceHistory.company_id == company_id)
            .filter(StockPriceHistory.date <= as_of)      # latest <= as_of
            .order_by(StockPriceHistory.date.desc())
            .first()
        )
        if not row or row[0] is None:
            return None
        return Decimal(str(row[0]))

    def fx_rate(inst_ccy: str, base: str, company_id: int) -> Decimal | None:
        inst_ccy = inst_ccy.upper()
        base = base.upper()
        if inst_ccy == base:
            return Decimal("1")

        # direct latest <= as_of
        direct = (
            db.query(FxRate.close)
            .filter(FxRate.base_currency == inst_ccy)
            .filter(FxRate.quote_currency == base)
            .filter(FxRate.date <= as_of)
            .order_by(FxRate.date.desc())
            .first()
        )
        if direct and direct[0] is not None:
            return Decimal(str(direct[0]))

        # inverse latest <= as_of
        inverse = (
            db.query(FxRate.close)
            .filter(FxRate.base_currency == base)
            .filter(FxRate.quote_currency == inst_ccy)
            .filter(FxRate.date <= as_of)
            .order_by(FxRate.date.desc())
            .first()
        )
        if inverse and inverse[0] not in (None, 0):
            return Decimal("1") / Decimal(str(inverse[0]))

        # fallback: last transaction currency_rate for this company (tx currency must match inst_ccy)
        last_tx = (
            db.query(Transaction.currency, Transaction.currency_rate)
            .filter(Transaction.portfolio_id == portfolio_id)
            .filter(Transaction.company_id == company_id)
            .filter(Transaction.timestamp <= cutoff)
            .order_by(Transaction.timestamp.desc())
            .first()
        )
        if last_tx and last_tx[0] and last_tx[1]:
            tx_ccy = (last_tx[0] or "").upper()
            if tx_ccy == inst_ccy:
                return Decimal(str(last_tx[1]))

        return None

    # 3) Build valuation
    total_base = Decimal("0")
    lines = []

    for r in rows:
        c_id = r.company_id
        qty = Decimal(str(r.qty))
        inst_ccy = (r.inst_ccy or base_ccy).upper()

        px = latest_price(c_id)  # <= as_of
        if px is None:
            # no price yet for this instrument up to as_of → skip instrument for that day
            continue

        val_inst = qty * px
        rate = fx_rate(inst_ccy, base_ccy, c_id)
        if rate is None:
            # no FX available even via fallback → skip instrument
            continue

        val_base = val_inst * rate
        total_base += val_base
        lines.append({
            "company_id": c_id,
            "qty": str(qty),
            "price_inst": str(px),
            "inst_ccy": inst_ccy,
            "fx_to_base": str(rate),
            "value_base": str(val_base),
        })

    return {
        "portfolio_id": portfolio_id,
        "base_currency": base_ccy,
        "as_of": as_of.isoformat(),
        "total": str(total_base.quantize(Decimal("0.01"))),
        "lines": lines,
    }
