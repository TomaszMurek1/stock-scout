from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from api.dependencies.portfolio import get_user_portfolio
from database.base import get_db
from schemas.portfolio_schemas import (
    TransactionItem,
)
from services.portfolio_transactions_service import get_transactions_for_portfolio

router = APIRouter(prefix="", tags=["Portfolio"])


def _parse_period(period: str) -> Optional[datetime]:
    if period.upper() == "ALL":
        return None
    mapping = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}
    days = mapping.get(period.upper(), 30)
    return datetime.utcnow() - timedelta(days=days)


@router.get("/transactions", response_model=List[TransactionItem])
def get_transactions(
    period: str = Query("All", description="Window like '1M','3M','6M','1Y' or 'All' which is default"),
    db: Session = Depends(get_db),
    portfolio = Depends(get_user_portfolio),
):
    cutoff = _parse_period(period)

    return get_transactions_for_portfolio(db, portfolio.id, period)

