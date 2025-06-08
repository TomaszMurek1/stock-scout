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
    # Default range (only used for fetching new data)

    result = {}

    for base, quote in payload.pairs:
        # Ensure DB is filled up to today
        fetch_and_save_fx_rate(base, quote, db)

        # Return all historical records available for this pair
        rates = (
            db.query(FxRate)
            .filter_by(base_currency=base, quote_currency=quote)
            .order_by(FxRate.date)
            .all()
        )
        historical_data = [
            {
                "date": r.date.isoformat(),
                "close": r.close,
            }
            for r in rates
            if r.close is not None
        ]
        note = None
        if not historical_data:
            # fallback to most recent available data
            latest = (
                db.query(FxRate)
                .filter_by(base_currency=base, quote_currency=quote)
                .order_by(FxRate.date.desc())
                .first()
            )
            if latest:
                historical_data = [
                    {
                        "date": latest.date.isoformat(),
                        "close": latest.close,
                    }
                ]
                note = (
                    "Returned most recent available data; may be older than requested."
                )

        result[f"{base}-{quote}"] = {
            "base": base,
            "quote": quote,
            "historicalData": historical_data,
        }
        if note:
            result[f"{base}-{quote}"]["note"] = note
    return result
