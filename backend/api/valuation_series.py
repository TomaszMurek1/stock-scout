from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.base import get_db
from database.portfolio import Portfolio
from database.valuation import PortfolioValuationDaily

router = APIRouter(prefix="/api/valuation", tags=["valuation"])

@router.get("/series")
def valuation_series(
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end < start")

    # ensure portfolio exists
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    rows = (
        db.query(PortfolioValuationDaily.date, PortfolioValuationDaily.total_value)
        .filter(PortfolioValuationDaily.portfolio_id == portfolio_id)
        .filter(PortfolioValuationDaily.date >= start)
        .filter(PortfolioValuationDaily.date <= end)
        .order_by(PortfolioValuationDaily.date)
        .all()
    )

    return {
        "portfolio_id": portfolio_id,
        "points": [{"date": r[0].isoformat(), "total": str(r[1])} for r in rows],
    }
