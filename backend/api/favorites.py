from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.auth.auth import get_current_user
from database.base import get_db
from database.portfolio import FavoriteStock
from database.user import User
from database.company import Company
from sqlalchemy.orm import joinedload

router = APIRouter()


@router.post("/{ticker}")
def add_to_favorites(
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
        raise HTTPException(status_code=400, detail="Already in favorites")

    fav = FavoriteStock(user_id=user.id, company_id=company.company_id)
    db.add(fav)
    db.commit()
    return {"message": "Added to favorites"}


def get_favorite_companies_for_user(db: Session, user: User):
    favorites = (
        db.query(FavoriteStock)
        .options(joinedload(FavoriteStock.company))
        .filter(FavoriteStock.user_id == user.id)
        .all()
    )

    return [
        {
            "company_id": fav.company_id,
            "ticker": fav.company.ticker,
            "name": fav.company.name,
        }
        for fav in favorites
    ]


@router.get("")
def list_favorites(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return get_favorite_companies_for_user(db, user)


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
        raise HTTPException(status_code=404, detail="Not in favorites")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}
