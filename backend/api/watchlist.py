from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from api.portfolio_crud import get_or_create_portfolio
from services.auth.auth import get_current_user
from database.base import get_db
from database.portfolio import FavoriteStock
from database.position import Position
from database.user import User
from database.company import Company
from sqlalchemy.orm import joinedload
from database.stock_data import CompanyMarketData

router = APIRouter()


@router.post("/{ticker}")
def add_to_watchlist(
    ticker: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    exists = (
        db.query(FavoriteStock)
        .filter_by(user_id=user.id, company_id=company.company_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Already in watchlist")

    fav = FavoriteStock(user_id=user.id, company_id=company.company_id)
    db.add(fav)
    db.commit()
    return {"message": "Added to watchlist"}


def get_watchlist_companies_for_user(db: Session, user: User):
    watchlist = (
        db.query(FavoriteStock)
        .options(joinedload(FavoriteStock.company))
        .filter(FavoriteStock.user_id == user.id)
        .all()
    )

    return [
        {
            "ticker": item.company.ticker,
            "name": item.company.name,
        }
        for item in watchlist
    ]


def get_holdings_for_user(db: Session, user) -> List[dict]:
    """
    Returns a list of:
      [{"ticker": ..., "name": ..., "shares": ..., "average_price": ...}, ...]
    """
    portfolio = get_or_create_portfolio(db, user.id)
    # Use all accounts for this portfolio, then positions for those accounts
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    positions = (
        db.query(Position)
        .filter(Position.account_id.in_(account_ids))
        .all()
    )

    holdings = []
    for pos in positions:
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )
        last_price = None
        if latest_md and latest_md.current_price is not None:
            last_price = round(float(latest_md.current_price), 2)

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "average_price": float(pos.avg_cost),     # field name changed
                "last_price": last_price,
                "currency": (
                    latest_md.market.currency
                    if (latest_md and latest_md.market and latest_md.market.currency)
                    else None
                ),
            }
        )
    return holdings


@router.get("")
def list_favorites(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return get_watchlist_companies_for_user(db, user)


@router.delete("/{ticker}")
def remove_from_favorites(
    ticker: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    fav = (
        db.query(FavoriteStock)
        .filter_by(user_id=user.id, company_id=company.company_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="Not in watchlist")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from watchlist"} 
