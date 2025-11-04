from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.portfolio import PortfolioPosition, Transaction, Portfolio
from services.auth.auth import get_current_user
from database.base import get_db
from schemas.portfolio_schemas import TradeRequest
from database.user import User
from database.company import Company
from decimal import Decimal

router = APIRouter()


@router.post("/buy")
def buy_stock(
    req: TradeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    company = db.query(Company).get(req.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    portfolio = (
        db.query(Portfolio).filter_by(user_id=user.id).first()
    )  # for now, just use default

    pos = (
        db.query(PortfolioPosition)
        .filter_by(portfolio_id=portfolio.id, company_id=req.company_id)
        .first()
    )
    if not pos:
        pos = PortfolioPosition(
            portfolio_id=portfolio.id,
            company_id=req.company_id,
            quantity=Decimal("0"),
            average_cost=Decimal("0"),
        )
        db.add(pos)
        db.flush()

    # Weighted average cost update
    total_cost_before = pos.quantity * pos.average_cost
    total_cost_new = req.quantity * req.price
    pos.quantity += req.quantity
    pos.average_cost = (total_cost_before + total_cost_new) / pos.quantity

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=req.company_id,
        transaction_type="buy",
        quantity=req.quantity,
        price=req.price,
        total_value=req.quantity * req.price,
    )
    db.add(tx)
    db.commit()
    return {"message": "Buy successful"}


@router.post("/sell")
def sell_stock(
    req: TradeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = db.query(Portfolio).filter_by(user_id=user.id).first()
    pos = (
        db.query(PortfolioPosition)
        .filter_by(portfolio_id=portfolio.id, company_id=req.company_id)
        .first()
    )
    if not pos or pos.quantity < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient shares")

    pos.quantity -= req.quantity
    if pos.quantity == 0:
        pos.average_cost = Decimal("0")

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        company_id=req.company_id,
        transaction_type="sell",
        quantity=req.quantity,
        price=req.price,
        total_value=req.quantity * req.price,
    )
    db.add(tx)
    db.commit()
    return {"message": "Sell successful"}


@router.get("/positions")
def get_positions(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    portfolio = db.query(Portfolio).filter_by(user_id=user.id).first()
    positions = db.query(PortfolioPosition).filter_by(portfolio_id=portfolio.id).all()

    result = []
    for pos in positions:
        current_price = (
            pos.company.market_data.current_price if pos.company.market_data else None
        )
        if current_price is not None:
            market_value = pos.quantity * current_price
            cost = pos.quantity * pos.average_cost
            profit = market_value - cost
        else:
            market_value = cost = profit = None

        result.append(
            {
                "company": pos.company.name,
                "ticker": pos.company.ticker,
                "shares": float(pos.quantity),
                "average_cost": float(pos.average_cost),
                "current_price": float(current_price) if current_price else None,
                "unrealized_profit": float(profit) if profit else None,
            }
        )
    return result
