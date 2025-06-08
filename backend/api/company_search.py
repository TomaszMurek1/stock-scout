from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.base import get_db
from database.company import Company
from typing import Optional

router = APIRouter()


@router.get("/")
def search_companies(
    search: Optional[str] = Query(None, description="Search by name or ticker"),
    market_id: Optional[int] = Query(None, description="Market ID"),
    db: Session = Depends(get_db),
    limit: int = 15,
):
    query = db.query(Company)
    if market_id:
        query = query.filter(Company.market_id == market_id)
    if search:
        search = f"%{search}%"
        query = query.filter(
            (Company.name.ilike(search)) | (Company.ticker.ilike(search))
        )
    companies = query.limit(limit).all()
    return [
        {
            "company_id": c.company_id,
            "name": c.name,
            "ticker": c.ticker,
            "market": (
                {"market_id": c.market.market_id, "name": c.market.name}
                if c.market
                else None
            ),
        }
        for c in companies
    ]
