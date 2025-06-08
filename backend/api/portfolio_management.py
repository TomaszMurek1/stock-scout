from decimal import Decimal
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from api.portfolio_crud import get_or_create_portfolio
from api.security import get_current_user
from api.watchlist import get_watchlist_companies_for_user
from schemas.portfolio_schemas import (
    RateItem,
    TradeBase,
    TradeResponse,
    UserPortfolioResponse,
)
from database.base import get_db
from database.user import User
from database.portfolio import Transaction, TransactionType
from database.company import Company
from database.stock_data import StockPriceHistory

router = APIRouter()


@router.post("/buy", response_model=TradeResponse, tags=["Portfolio"])
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


@router.post("/sell", response_model=TradeResponse, tags=["Portfolio"])
def sell_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = db.query(Company).filter(Company.ticker == trade.ticker.upper()).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # compute net shares owned via transactions
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
    )
    db.add(tx)
    db.commit()
    return {"message": "Sell recorded"}


# ← static for now, swap for real FX engine later
EXCHANGE_RATES = [
    {"from": "EUR", "to": "USD", "rate": 1.10},
    {"from": "PLN", "to": "USD", "rate": 3.75},
]


@router.get(
    "",
    response_model=UserPortfolioResponse,
    tags=["Portfolio"],
)
def get_user_portfolio_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)

    # 1) Aggregate all BUY/SELL transactions into per‐ticker stats
    txs = (
        db.query(Transaction)
        .filter(Transaction.portfolio_id == portfolio.id)
        .filter(
            Transaction.transaction_type.in_(
                [TransactionType.BUY, TransactionType.SELL]
            )
        )
        .all()
    )
    agg: Dict[int, Dict[str, Any]] = {}
    for tx in txs:
        rec = agg.setdefault(
            tx.company_id,
            {
                "ticker": tx.company.ticker,
                "name": tx.company.name,
                "net_shares": Decimal("0"),
                "total_buy_qty": Decimal("0"),
                "total_buy_cost": Decimal("0"),
            },
        )
        sign = (
            Decimal("1")
            if tx.transaction_type == TransactionType.BUY
            else Decimal("-1")
        )
        rec["net_shares"] += sign * tx.quantity
        if tx.transaction_type == TransactionType.BUY:
            rec["total_buy_qty"] += tx.quantity
            rec["total_buy_cost"] += tx.quantity * tx.price

    # 2) Build holdings list including latest price & currency from StockPriceHistory
    holdings: List[dict] = []
    for comp_id, data in agg.items():
        if data["net_shares"] <= 0:
            continue  # skip closed positions

        avg_price = (
            data["total_buy_cost"] / data["total_buy_qty"]
            if data["total_buy_qty"] > 0
            else Decimal("0")
        )

        # get most recent StockPriceHistory row for this company
        sph = (
            db.query(StockPriceHistory)
            .filter(StockPriceHistory.company_id == comp_id)
            .order_by(StockPriceHistory.date.desc())
            .join(StockPriceHistory.market)  # so we can get .market.currency
            .first()
        )
        last_price = sph.close if sph and sph.close is not None else None
        currency = (
            sph.market.currency if sph and sph.market and sph.market.currency else None
        )

        holdings.append(
            {
                "ticker": data["ticker"],
                "name": data["name"],
                "shares": float(data["net_shares"]),
                "average_price": float(avg_price),
                "last_price": (
                    round(float(last_price), 2) if last_price is not None else None
                ),
                "currency": currency,
            }
        )

    # 3) Watchlist & FX rates remain the same
    watchlist = get_watchlist_companies_for_user(db, user)
    rates = [RateItem(**r) for r in EXCHANGE_RATES]

    return {
        "portfolio": {
            "id": portfolio.id,
            "name": portfolio.name,
            "currency": portfolio.currency,
        },
        "holdings": holdings,
        "watchlist": watchlist,
        "currency_rates": rates,
    }
