from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, selectinload
from database.base import get_db
from database.portfolio import Transaction, TransactionType
from database.stock_data import StockPriceHistory
from database.company import Company
from api.portfolio_crud import get_or_create_portfolio
from api.security import get_current_user
from database.user import User
from schemas.portfolio_schemas import (
    PriceHistoryRequest,
    TransactionItem,
    PriceHistoryItem,
)

router = APIRouter(prefix="", tags=["portfolio-performance"])


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
            ticker=tx.company.ticker,
            quantity=float(tx.quantity),
            price=float(tx.price),
            fee=float(tx.fee or 0),
            total_value=float(tx.total_value),
            timestamp=tx.timestamp,
        )
        for tx in txs
    ]


@router.post("/price-history", response_model=List[PriceHistoryItem])
def price_history(
    req: PriceHistoryRequest,
    db: Session = Depends(get_db),
):
    # 1) Determine cutoff_date via start_date > period > All
    if req.start_date:
        try:
            cutoff_date = datetime.fromisoformat(req.start_date).date()
        except ValueError:
            raise HTTPException(400, "start_date must be YYYY-MM-DD")
    elif req.period.upper() == "ALL":
        cutoff_date = None
    else:
        mapping = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}
        days = mapping.get(req.period.upper(), 30)
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).date()

    # 2) Map tickers → company_ids
    companies = db.query(Company).filter(Company.ticker.in_(req.tickers)).all()
    if not companies:
        raise HTTPException(404, "No matching companies")
    id_map = {c.company_id: c.ticker for c in companies}
    company_ids = list(id_map.keys())

    # 3) Query price history from cutoff_date (if any)
    query = db.query(StockPriceHistory).filter(
        StockPriceHistory.company_id.in_(company_ids)
    )
    if cutoff_date:
        query = query.filter(StockPriceHistory.date >= cutoff_date)

    records = query.order_by(StockPriceHistory.company_id, StockPriceHistory.date).all()

    return [
        PriceHistoryItem(ticker=id_map[r.company_id], date=r.date, close=r.close)
        for r in records
    ]
