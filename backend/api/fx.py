# /api/fx.py
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import List, Optional
from database.base import get_db

from database.fx import FxRate
from datetime import date

from services.fx.fx_rate_service import fetch_and_save_fx_rate

router = APIRouter()


class FxPair(BaseModel):
    base: str
    quote: str

    @field_validator("base", "quote")
    @classmethod
    def _normalize(cls, v: str) -> str:
        value = (v or "").strip().upper()
        if len(value) != 3:
            raise ValueError("Currency codes must be 3 letters")
        return value


class FxBatchRequest(BaseModel):
    pairs: List[FxPair]
    start: Optional[date] = None
    end: Optional[date] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "pairs": [
                    {"base": "USD", "quote": "PLN"},
                    {"base": "EUR", "quote": "PLN"},
                ],
                "start": "2024-01-01",
                "end": "2024-02-01"
            }
        }
    }


@router.post("/batch")
def get_fx_rates_batch(
    payload: FxBatchRequest = Body(...), db: Session = Depends(get_db)
):
    if payload.start and payload.end and payload.start > payload.end:
        raise HTTPException(status_code=400, detail="start date must be before end date")

    result = {}

    for pair in payload.pairs:
        base = pair.base
        quote = pair.quote
        fetch_and_save_fx_rate(base, quote, db, payload.start, payload.end)

        # Return all historical records available for this pair
        rates = (
            db.query(FxRate)
            .filter_by(base_currency=base, quote_currency=quote)
            .filter(FxRate.date >= (payload.start or date(1900, 1, 1)))
            .filter(FxRate.date <= (payload.end or date.today()))
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
            # fallback to most recent available data using helper
            from services.fx.fx_rate_helper import get_latest_fx_rate
            
            latest_rate = get_latest_fx_rate(db, base, quote)
            if latest_rate:
                # Get the date of the latest rate
                latest_record = (
                    db.query(FxRate.date)
                    .filter_by(base_currency=base, quote_currency=quote)
                    .order_by(FxRate.date.desc())
                    .first()
                )
                if latest_record:
                    historical_data = [
                        {
                            "date": latest_record[0].isoformat(),
                            "close": latest_rate,
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
