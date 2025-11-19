from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.base import get_db
from database.baskets import Basket
from schemas.basket_schemas import BasketOut
from services.auth.auth import get_current_user
from database.user import User

router = APIRouter()


@router.get("/baskets", response_model=List[BasketOut], operation_id="baskets_list")
def list_baskets(
    include_global: bool = True,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Return baskets available to the current user (global + owned).
    """
    query = db.query(Basket)
    if current_user:
        if include_global:
            query = query.filter(
                or_(Basket.owner_id == None, Basket.owner_id == current_user.id)  # noqa: E711
            )
        else:
            query = query.filter(Basket.owner_id == current_user.id)
    elif not include_global:
        query = query.filter(Basket.owner_id == None)  # noqa: E711

    return query.order_by(Basket.name.asc()).all()
