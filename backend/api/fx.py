# /api/fx.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.base import get_db

from database.fx import FxRate
from datetime import date, timedelta

from services.fx.fx_rate_service import fetch_and_save_fx_rate

router = APIRouter()


@router.get("/{base}/{quote}")
def get_and_update_fx_rate(
    base: str,
    quote: str,
    start: date = None,
    end: date = None,
    db: Session = Depends(get_db),
):
    today = date.today()
    if not end:
        end = today
    if not start:
        start = today - timedelta(days=365)

    # Fill in any missing data in the range
    fetch_and_save_fx_rate(base, quote, db, initial_start_date=start)

    # Query requested range
    rates = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote)
        .filter(FxRate.date >= start, FxRate.date <= end)
        .order_by(FxRate.date)
        .all()
    )

    if rates:
        return [
            {
                "base": r.base_currency,
                "quote": r.quote_currency,
                "date": r.date,
                "open": r.open,
                "high": r.high,
                "low": r.low,
                "close": r.close,
            }
            for r in rates
        ]

    # Fallback: get the latest available rate for that pair
    latest = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote)
        .order_by(FxRate.date.desc())
        .first()
    )
    if latest:
        return [
            {
                "base": latest.base_currency,
                "quote": latest.quote_currency,
                "date": latest.date,
                "open": latest.open,
                "high": latest.high,
                "low": latest.low,
                "close": latest.close,
                "note": "Returned most recent available data; may be older than requested.",
            }
        ]

    # No data at all for this pair
    raise HTTPException(status_code=404, detail="No FX rates found.")
