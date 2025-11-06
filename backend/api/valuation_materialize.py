# api/valuation_materialize.py
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio, Transaction
from database.valuation import PortfolioValuationDaily  # your existing model
from api.valuation_preview import preview_day_value     # reuse the working calc

router = APIRouter(prefix="/api/valuation", tags=["valuation"])

def _first_tx_date(db, portfolio_id: int):
    dt = (
        db.query(func.min(Transaction.timestamp))
        .filter(Transaction.portfolio_id == portfolio_id)
        .scalar()
    )
    return dt.date() if dt else None

@router.post("/materialize-day")
def materialize_day(portfolio_id: int, as_of: date, db: Session = Depends(get_db)):
    # make sure portfolio exists (and get its base ccy if you ever need it)
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # compute total using your preview logic
    preview = preview_day_value(portfolio_id=portfolio_id, as_of=as_of, db=db)

    # parse decimal safely
    try:
        total = Decimal(preview["total"])
    except Exception:
        total = Decimal("0")

    # Upsert on (portfolio_id, date)
    stmt = insert(PortfolioValuationDaily).values(
        portfolio_id=portfolio_id,
        date=as_of,
        total_value=total,          # Numeric(20,4)
        by_stock=Decimal("0"),
        by_etf=Decimal("0"),
        by_bond=Decimal("0"),
        by_crypto=Decimal("0"),
        by_commodity=Decimal("0"),
        by_cash=Decimal("0"),
        net_contributions=Decimal("0"),
        created_at=datetime.utcnow(),   # matches your model’s naive UTC datetime
    ).on_conflict_do_update(
        index_elements=["portfolio_id", "date"],  # matches your UniqueConstraint
        set_={
            "total_value": total,
            # keep breakdowns/net_contributions zero for now (will fill later)
            "by_stock": Decimal("0"),
            "by_etf": Decimal("0"),
            "by_bond": Decimal("0"),
            "by_crypto": Decimal("0"),
            "by_commodity": Decimal("0"),
            "by_cash": Decimal("0"),
            "net_contributions": Decimal("0"),
            # don't touch created_at on update
        },
    )

    db.execute(stmt)
    db.commit()

    return {
        "message": "materialized",
        "portfolio_id": portfolio_id,
        "date": as_of.isoformat(),
        "total_value": str(total),
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
        # no transactions at all → nothing to do
        return {"portfolio_id": portfolio_id, "points": []}

    # clamp start so we don't write zeros before first trade
    cur = max(start, first_dt)
    out = []
    while cur <= end:
        res = materialize_day(portfolio_id=portfolio_id, as_of=cur, db=db)
        out.append({"date": res["date"], "total_value": res["total_value"]})
        cur += timedelta(days=1)

    return {"portfolio_id": portfolio_id, "points": out}