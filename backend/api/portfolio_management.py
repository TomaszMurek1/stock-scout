from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.portfolio_crud import get_or_create_portfolio
from api.watchlist import (
    get_holdings_for_user,
    get_watchlist_companies_for_user,
)
from database.user import User
from .security import (
    get_current_user,
)
from database.base import get_db
from database.company import Company
from database.portfolio import (
    Portfolio,
    PortfolioPosition,
    Transaction,
    TransactionType,
)
from schemas.portfolio_schemas import (
    TradeBase,
    TradeResponse,
    UserPortfolioResponse,
)

# from services.market import (
#     current_price_for_ticker,
# )  # ⬅️ helper you already have / or stub

router = APIRouter()


def _update_position_on_buy(
    pos: PortfolioPosition, qty: Decimal, price: Decimal, fee: Decimal
):
    total_cost_before = pos.quantity * pos.average_cost
    total_cost_new = qty * price + fee
    pos.quantity += qty
    pos.average_cost = (total_cost_before + total_cost_new) / pos.quantity


def _update_position_on_sell(
    pos: PortfolioPosition, qty: Decimal, price: Decimal, fee: Decimal
):
    if qty > pos.quantity:
        raise HTTPException(status_code=400, detail="Not enough shares to sell")
    pos.quantity -= qty
    # average_cost remains as is
    # if position closed:
    if pos.quantity == 0:
        pos.average_cost = 0


# ---------- endpoints ----------------------------------------------
@router.post("/buy", response_model=TradeResponse)
def buy_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = db.query(Company).filter(Company.ticker == trade.ticker.upper()).first()
    if not company:
        raise HTTPException(404, "Company not found")

    pos = (
        db.query(PortfolioPosition)
        .filter_by(portfolio_id=portfolio.id, company_id=company.company_id)
        .first()
    )
    if not pos:
        pos = PortfolioPosition(
            portfolio_id=portfolio.id, company_id=company.company_id
        )
        db.add(pos)
        db.flush()

    _update_position_on_buy(pos, trade.shares, trade.price, trade.fee)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=company.company_id,
        transaction_type=TransactionType.BUY,
        quantity=trade.shares,
        price=trade.price,
        fee=trade.fee,
        total_value=trade.shares * trade.price + trade.fee,
    )

    db.add(tx)
    db.commit()
    return {"message": "Buy recorded"}


@router.post("/sell", response_model=TradeResponse)
def sell_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = db.query(Company).filter(Company.ticker == trade.ticker.upper()).first()
    if not company:
        raise HTTPException(404, "Company not found")

    pos = (
        db.query(PortfolioPosition)
        .filter_by(portfolio_id=portfolio.id, company_id=company.company_id)
        .first()
    )
    if not pos:
        raise HTTPException(400, "No position to sell")

    _update_position_on_sell(pos, trade.shares, trade.price, trade.fee)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=company.company_id,
        transaction_type=TransactionType.SELL,
        quantity=trade.shares,
        price=trade.price,
        fee=trade.fee,
        total_value=trade.shares * trade.price - trade.fee,
    )

    db.add(tx)
    db.commit()
    return {"message": "Sell recorded"}


@router.get(
    "",
    response_model=UserPortfolioResponse,  # ← tell FastAPI what shape to expect
    tags=["Portfolio"],
)
def get_user_portfolio_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 1. Load or create the default portfolio (SQLAlchemy model)
    portfolio: Portfolio = get_or_create_portfolio(db, user.id)

    # 2. Fetch your holdings and watchlist as lists of plain dicts
    holdings = get_holdings_for_user(db, user)  # -> List[HoldingItem]
    watchlist = get_watchlist_companies_for_user(db, user)  # -> List[WatchlistItem]

    # 3. Return a pure dict; FastAPI will coerce it into UserPortfolioResponse
    return {
        "portfolio": {"id": portfolio.id, "name": portfolio.name},
        "holdings": holdings,
        "watchlist": watchlist,
    }
