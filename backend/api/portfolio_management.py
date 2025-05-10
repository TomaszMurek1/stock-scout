from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.watchlist import get_watchlist_companies_for_user
from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User

router = APIRouter()


@router.get("")
def get_user_portfolio_data(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    watchlist = get_watchlist_companies_for_user(db, user)
    # add portfolio-specific logic here if needed
    return {"watchlist": watchlist}
