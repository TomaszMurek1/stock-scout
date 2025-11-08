from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, selectinload
from services.auth.auth import get_current_user
from database.base import get_db
from database.portfolio import Transaction
from database.stock_data import StockPriceHistory
from database.company import Company
from api.portfolio_crud import get_or_create_portfolio
from database.user import User
from schemas.portfolio_schemas import (
    PriceHistoryRequest,
    TransactionItem,
    TransactionType,
)
from collections import defaultdict

router = APIRouter(prefix="", tags=["Portfolio performance"])


def _parse_period(period: str) -> Optional[datetime]:
    if period.upper() == "ALL":
        return None
    mapping = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}
    days = mapping.get(period.upper(), 30)
    return datetime.utcnow() - timedelta(days=days)


@router.get("/transactions", response_model=List[TransactionItem])
def get_transactions(
    period: str = Query("1M", description="Window like '1M','3M','6M','1Y' or 'All'"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cutoff = _parse_period(period)
    portfolio = get_or_create_portfolio(db, user.id)

    query = (
        db.query(Transaction)
        .options(selectinload(Transaction.company))
        .filter(
            Transaction.portfolio_id == portfolio.id,
            Transaction.transaction_type.in_(
                [TransactionType.BUY, TransactionType.SELL]
            ),
        )
    )
    if cutoff:
        query = query.filter(Transaction.timestamp >= cutoff)

    txs = query.order_by(Transaction.timestamp.asc()).all()

    return [
        TransactionItem(
            id=tx.id,
            ticker=tx.company.ticker if tx.company else "",
            name=tx.company.name if tx.company else "",
            transaction_type=tx.transaction_type.value,
            shares=Decimal(
                str(tx.quantity)
            ),  # If tx.quantity is already Decimal, you can just use tx.quantity
            price=Decimal(str(tx.price)),
            fee=Decimal(str(tx.fee or 0)),
            timestamp=tx.timestamp,
            # Replace with actual currency if you have it on company/market
            currency="PLN",
            currency_rate=Decimal(
                "1.0"
            ),  # Replace with the correct rate if you have multi-currency support
        )
        for tx in txs
    ]

