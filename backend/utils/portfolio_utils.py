# utils/portfolio_utils.py

from datetime import date, datetime
from decimal import Decimal
from fastapi import HTTPException
from typing import Dict, Optional

def to_float(v):
    if v is None:
        return None
    if isinstance(v, (Decimal, int, float)):
        return float(v)
    return v

def serialize_breakdown(breakdown):
    if breakdown is None:
        return {}
    if isinstance(breakdown, dict):
        return {k: serialize_breakdown(v) for k,v in breakdown.items()}
    if isinstance(breakdown, list):
        return [serialize_breakdown(item) for item in breakdown]
    return to_float(breakdown)

def parse_as_of_date(as_of: Optional[str]) -> date:
    if not as_of:
        return date.today()
    try:
        return datetime.strptime(as_of, "%Y-%m-%d").date()
    except ValueError:
        try:
            return datetime.fromisoformat(as_of).date()
        except:
            raise HTTPException(400, f"Invalid as_of_date: {as_of}")