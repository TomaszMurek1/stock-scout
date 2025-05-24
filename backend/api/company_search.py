from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.base import get_db
from database.company import Company
from database.market import Market
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
        query = query.join(Company.markets).filter(Market.market_id == market_id)
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
            "markets": [{"market_id": m.market_id, "name": m.name} for m in c.markets],
        }
        for c in companies
    ]
