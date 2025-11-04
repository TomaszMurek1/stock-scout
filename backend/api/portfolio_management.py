# api/portfolio_management.py

from decimal import Decimal
from typing import List, Dict, Any, Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case

from api.portfolio_crud import get_or_create_portfolio
from api.security import get_current_user
from database.base import get_db
from database.user import User
from database.portfolio import (
    Portfolio,
    Transaction,
    TransactionType,
    FavoriteStock,
)
from database.company import Company
from database.fx import FxRate
from schemas.portfolio_schemas import (
    TradeBase,
    TradeResponse,
    UserPortfolioResponse,
)
from database.stock_data import StockPriceHistory

router = APIRouter()


@router.post("/buy", response_model=TradeResponse)
def buy_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = db.query(Company).filter(Company.ticker == trade.ticker.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=company.company_id,
        transaction_type=TransactionType.BUY,
        quantity=trade.shares,
        price=trade.price,
        fee=trade.fee or Decimal("0"),
        total_value=trade.shares * trade.price + (trade.fee or Decimal("0")),
        currency=trade.currency,
        currency_rate=trade.currency_rate,
    )
    db.add(tx)
    db.commit()
    return {"message": "Buy recorded"}


@router.post("/sell", response_model=TradeResponse)
def sell_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = db.query(Company).filter(Company.ticker == trade.ticker.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # calculate net owned shares
    owned = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        [
                            (
                                Transaction.transaction_type == TransactionType.BUY,
                                Transaction.quantity,
                            ),
                            (
                                Transaction.transaction_type == TransactionType.SELL,
                                -Transaction.quantity,
                            ),
                        ],
                        else_=0,
                    )
                ),
                0,
            )
        )
        .filter(Transaction.portfolio_id == portfolio.id)
        .filter(Transaction.company_id == company.company_id)
        .scalar()
    )
    if owned < trade.shares:
        raise HTTPException(status_code=400, detail="Insufficient shares to sell")

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=company.company_id,
        transaction_type=TransactionType.SELL,
        quantity=trade.shares,
        price=trade.price,
        fee=trade.fee or Decimal("0"),
        total_value=trade.shares * trade.price - (trade.fee or Decimal("0")),
        currency=trade.currency,
        currency_rate=trade.currency_rate,
    )
    db.add(tx)
    db.commit()
    return {"message": "Sell recorded"}


@router.get("", response_model=UserPortfolioResponse)
def get_user_portfolio_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 1) get or create portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        portfolio = Portfolio(user_id=user.id, name="Default", currency="PLN")
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)

    # 2) serialize transactions
    raw_txs: List[Transaction] = (
        db.query(Transaction)
        .filter(Transaction.portfolio_id == portfolio.id)
        .order_by(Transaction.timestamp)
        .options(joinedload(Transaction.company))
        .all()
    )
    transactions = [
        {
            "id": tx.id,
            "ticker": tx.company.ticker,
            "name": tx.company.name,
            "transaction_type": tx.transaction_type.value,
            "shares": float(tx.quantity),
            "price": float(tx.price),
            "fee": float(tx.fee or 0),
            "timestamp": tx.timestamp.isoformat(),
            "currency": tx.currency,
            "currency_rate": float(tx.currency_rate),
        }
        for tx in raw_txs
    ]

    # 3) watchlist
    wl = (
        db.query(FavoriteStock)
        .options(joinedload(FavoriteStock.company))
        .filter(FavoriteStock.user_id == user.id)
        .all()
    )
    watchlist = [{"ticker": w.company.ticker, "name": w.company.name} for w in wl]

    # 4) build currency_rates exactly like /fx-rate/batch
    fx_rows: List[FxRate] = (
        db.query(FxRate)
        .order_by(FxRate.base_currency, FxRate.quote_currency, FxRate.date)
        .all()
    )
    grouped: Dict[str, List[Dict[str, Union[str, float]]]] = {}
    for r in fx_rows:
        key = f"{r.base_currency}-{r.quote_currency}"
        grouped.setdefault(key, []).append(
            {
                "date": r.date.isoformat(),
                "close": float(r.close),
            }
        )

    currency_rates: Dict[str, Any] = {}
    for pair, hist in grouped.items():
        base, quote = pair.split("-")
        currency_rates[pair] = {
            "base": base,
            "quote": quote,
            "historicalData": hist,
        }

    # === New: get tickers for price history ===
    tickers = list({tx["ticker"] for tx in transactions if tx["ticker"]})

    # Query price history for all tickers (like in price-history route)
    companies = db.query(Company).filter(Company.ticker.in_(tickers)).all()
    id_map = {c.company_id: c.ticker for c in companies}
    company_ids = list(id_map.keys())
    query = db.query(StockPriceHistory).filter(
        StockPriceHistory.company_id.in_(company_ids)
    )
    records = query.order_by(StockPriceHistory.company_id, StockPriceHistory.date).all()

    from collections import defaultdict

    price_history = defaultdict(list)
    for r in records:
        ticker = id_map[r.company_id]
        price_history[ticker].append(
            {
                "date": r.date.isoformat(),
                "close": float(r.close),
            }
        )
    # Convert to regular dict for serialization
    price_history = dict(price_history)

    # 5) final payload
    return {
        "portfolio": {
            "id": portfolio.id,
            "name": portfolio.name,
            "currency": portfolio.currency,
        },
        "transactions": transactions,
        "watchlist": watchlist,
        "currency_rates": currency_rates,
        "price_history": price_history,  # <-- add this
    }
