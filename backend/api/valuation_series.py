# api/valuation/valuation_series.py
from datetime import date, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database.base import get_db
from database.portfolio import Portfolio, Transaction
from database.valuation import PortfolioValuationDaily
from api.valuation_materialize import materialize_day

router = APIRouter(prefix="/api/valuation", tags=["Valuation"])\

class SeriesRequest(BaseModel):
    portfolio_id: int
    start: date = Field(..., description="YYYY-MM-DD")
    end:   date = Field(..., description="YYYY-MM-DD")
    carry_forward: bool = Field(True, description="Fill missing dates with last value")
    include_breakdown: bool = Field(True, description="Include by_stock/by_cash/net_contributions if present")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "portfolio_id": 2,
                    "start": "2025-10-01",
                    "end": "2025-11-07",
                    "carry_forward": True,
                    "include_breakdown": True
                }
            ]
        }
    }

def _daterange(d1: date, d2: date):
    cur = d1
    while cur <= d2:
        yield cur
        cur += timedelta(days=1)

@router.get("/series", operation_id="valuation_getSeries")
def valuation_series(
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    carry_forward: bool = True,
    include_breakdown: bool = False,
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end < start")

    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # clamp to first transaction date to avoid leading zeros
    first_tx = (
        db.query(Transaction.timestamp)
        .filter(Transaction.portfolio_id == portfolio_id)
        .order_by(Transaction.timestamp.asc())
        .first()
    )
    if not first_tx:
        return {"portfolio_id": portfolio_id, "points": []}
    first_dt = first_tx[0].date()
    if end < first_dt:
        return {"portfolio_id": portfolio_id, "points": []}
    start = max(start, first_dt)

    # preload existing rows
    rows = (
        db.query(PortfolioValuationDaily)
        .filter(
            and_(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= start,
                PortfolioValuationDaily.date <= end,
            )
        )
        .all()
    )
    by_date = {r.date: r for r in rows}

    points = []
    last_total = None
    last_stock = None
    last_cash = None

    for d in _daterange(start, end):
        r = by_date.get(d)
        if not r:
            # compute + persist for this day
            res = materialize_day(portfolio_id=portfolio_id, as_of=d, db=db)
            total = Decimal(res["total_value"])
            if include_breakdown:
                stock = Decimal(res["by_stock"])
                cash = Decimal(res["by_cash"])
                points.append({
                    "date": d.isoformat(),
                    "total": str(total),
                    "by_stock": str(stock),
                    "by_cash": str(cash),
                    "net_contributions": str(Decimal(res["net_contributions"])),
                })
                last_stock, last_cash = stock, cash
            else:
                points.append({"date": d.isoformat(), "total": str(total)})
            last_total = total
            continue

        # have a stored row
        total = r.total_value
        if include_breakdown:
            stock = r.by_stock
            cash = r.by_cash
            points.append({
                "date": d.isoformat(),
                "total": str(total),
                "by_stock": str(stock),
                "by_cash": str(cash),
                "net_contributions": str(r.net_contributions),
            })
            last_stock, last_cash = stock, cash
        else:
            points.append({"date": d.isoformat(), "total": str(total)})
        last_total = total

    # optional forward-fill for any zeros/gaps (already dense now, so just carry forward if any None)
    if carry_forward and points:
        for i in range(len(points)):
            if include_breakdown:
                # if there were any None values (shouldn't be), carry forward last known ones
                pass  # left here intentionally; computation above already filled
            else:
                pass

    return {"portfolio_id": portfolio_id, "points": points}

@router.post("/series", operation_id="valuation_postSeries")
def valuation_series_post(payload: SeriesRequest, db: Session = Depends(get_db)):
    """Return time series of daily valuations (JSON body)."""
    return valuation_series(
        portfolio_id=payload.portfolio_id,
        start=payload.start,
        end=payload.end,
        db=db,
    )