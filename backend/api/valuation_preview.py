from datetime import datetime, date, time
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.company import Company
from database.market import Market
from database.stock_data import StockPriceHistory  # your existing table
from database.fx import FxRate  # your fx_rates table

router = APIRouter(prefix="/api/valuation", tags=["valuation"])

def _eod(d: date) -> datetime:
    return datetime.combine(d, time.max.replace(microsecond=0))

@router.get("/preview-day")
def preview_day_value(
    portfolio_id: int,
    as_of: date = Query(..., description="Date to value at (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    # 1) load portfolio (for base currency)
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = pf.currency  # you named it `currency` earlier

    # 2) holdings as of date = sum(BUY) - sum(SELL)
    #    grouped by company
    cutoff = _eod(as_of)

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


    # join Company->Market to find the instrument currency (assumes Market has currency)
    # if Market doesn't have currency column yet, you can temporarily use Company.currency if present
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
            "lines": []
        }

    company_ids = [r.company_id for r in rows]

    # 3) pull EOD prices for that date
    prices = (
        db.query(
            StockPriceHistory.company_id,
            StockPriceHistory.close
        )
        .filter(StockPriceHistory.company_id.in_(company_ids))
        .filter(StockPriceHistory.date == as_of)
        .all()
    )
    price_map = {c: Decimal(str(p)) for (c, p) in prices}

    # 4) FX map for inst_ccy -> base_ccy (we use close; if base=inst, rate=1)
    # collect required currency pairs
    needed_pairs = set()
    for r in rows:
        inst = (r.inst_ccy or base_ccy).upper()
        if inst != base_ccy:
            needed_pairs.add((inst, base_ccy))
    fx_map = {}
    if needed_pairs:
        q = db.query(FxRate.base_currency, FxRate.quote_currency, FxRate.close)\
             .filter(FxRate.date == as_of)
        # pull in one shot and filter in python
        for fr in q.all():
            fx_map[(fr.base_currency.upper(), fr.quote_currency.upper())] = Decimal(str(fr.close))

    total_base = Decimal("0")
    lines = []

    for r in rows:
        c_id = r.company_id
        qty = Decimal(str(r.qty))
        inst_ccy = (r.inst_ccy or base_ccy).upper()

        px = price_map.get(c_id)
        if px is None:
            # skip if price missing (you can choose to fallback to last available later)
            continue

        val_inst = qty * px
        if inst_ccy == base_ccy:
            val_base = val_inst
            fx_used = Decimal("1")
        else:
            fx_rate = fx_map.get((inst_ccy, base_ccy))
            if not fx_rate:
                # if rate missing, skip line; later you can add inversion or fallback
                continue
            val_base = val_inst * fx_rate
            fx_used = fx_rate

        total_base += val_base
        lines.append({
            "company_id": c_id,
            "qty": str(qty),
            "price_inst": str(px),
            "inst_ccy": inst_ccy,
            "fx_to_base": str(fx_used),
            "value_base": str(val_base)
        })

    return {
        "portfolio_id": portfolio_id,
        "base_currency": base_ccy,
        "as_of": as_of.isoformat(),
        "total": str(total_base.quantize(Decimal('0.01'))),
        "lines": lines
    }
