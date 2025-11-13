from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from database.base import get_db
from database.portfolio import Portfolio
from database.user import User
from api.auth import get_current_user


def get_user_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Portfolio:
    # Single portfolio per user assumption
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )

    if not portfolio:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found for this user."
        )

    return portfolio
