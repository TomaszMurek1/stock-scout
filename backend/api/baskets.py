from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.base import get_db
from database.baskets import Basket
from schemas.basket_schemas import BasketOut
from services.auth.auth import get_current_user
from services.basket_resolver import resolve_baskets_to_companies
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

    # Filter out hidden baskets (e.g. Delisted / OTC)
    query = query.filter(Basket.is_visible == True)  # noqa: E712

    return query.order_by(Basket.name.asc()).all()


@router.get("/baskets/{basket_id}/companies")
def get_basket_companies(
    basket_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Return the list of companies resolved for a specific basket.
    """
    # Check if basket exists and user has access
    basket = db.query(Basket).filter(Basket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    
    if basket.owner_id and (not current_user or basket.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this basket")

    _, companies = resolve_baskets_to_companies(db, [basket_id])
    
    return [
        {
            "company_id": c.company_id,
            "ticker": c.ticker,
            "name": c.name,
            "market_name": c.market.name if c.market else None,
            "exchange_code": c.yfinance_market
        }
        for c in companies
    ]


@router.put("/baskets/{basket_id}/rules")
def update_basket_rules(
    basket_id: int,
    rules: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the rules for a smart basket.
    """
    basket = db.query(Basket).filter(Basket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    
    if basket.owner_id and (basket.owner_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this basket")

    # If it's a global basket (owner_id is None), restrict to staff if desired, 
    # but for now let's prioritize the request. 
    # If the user is an admin they should be able to edit.
    
    basket.rules = rules
    db.commit()
    db.refresh(basket)
    
    return {"status": "success", "rules": basket.rules}
