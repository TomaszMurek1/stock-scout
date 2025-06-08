# /api/fx.py
from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from database.base import get_db

from database.fx import FxRate
from datetime import date, timedelta

from services.fx.fx_rate_service import fetch_and_save_fx_rate

router = APIRouter()


class FxBatchRequest(BaseModel):
    pairs: List[List[str]]  # e.g. [["USD", "PLN"], ["EUR", "PLN"]]
    start: Optional[date] = None
    end: Optional[date] = None


@router.post("/batch")
def get_fx_rates_batch(
    payload: FxBatchRequest = Body(...), db: Session = Depends(get_db)
):
    today = date.today()
    start = payload.start or (today - timedelta(days=365))
    end = payload.end or today

    result = {}

    for base, quote in payload.pairs:
        # Fill in missing data for each pair
        fetch_and_save_fx_rate(base, quote, db)
        # Get the rates for the pair
        rates = (
            db.query(FxRate)
            .filter_by(base_currency=base, quote_currency=quote)
            .filter(FxRate.date >= start, FxRate.date <= end)
            .order_by(FxRate.date)
            .all()
        )
        if rates:
            result[f"{base}-{quote}"] = [
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
        else:
            # fallback to latest available
            latest = (
                db.query(FxRate)
                .filter_by(base_currency=base, quote_currency=quote)
                .order_by(FxRate.date.desc())
                .first()
            )
            if latest:
                result[f"{base}-{quote}"] = [
                    {
                        "base": latest.base_currency,
                        "quote": latest.quote_currency,
                        "date": latest.date,
                        "open": latest.open,
                        "high": latest.high,
                        "low": latest.low,
                        "close": latest.close,
                        "note": (
                            "Returned most recent available data; "
                            "may be older than requested."
                        ),
                    }
                ]
            else:
                result[f"{base}-{quote}"] = []
    return result
