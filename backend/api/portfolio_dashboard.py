from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies.portfolio import get_user_portfolio
from api.portfolio_metrics import _parse_as_of_date, get_portfolio_performance
from database.base import get_db
from database.portfolio import Portfolio
from services.portfolio_metrics_service import PortfolioMetricsService

router = APIRouter()
@router.get("/dashboard")
def get_portfolio_dashboard(
    portfolio = Depends(get_user_portfolio),
    as_of_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):


    portfolio_id = portfolio.id
    end_date = _parse_as_of_date(as_of_date)
    svc = PortfolioMetricsService(db)

    performance = get_portfolio_performance(portfolio_id, end_date, include_breakdown=True)
    totals = svc.get_portfolio_totals(portfolio_id, end_date)
    holdings = svc.get_holdings(portfolio_id)
    # add anything else

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "performance": performance,
        "totals": totals,
        "holdings": holdings,
        # "allocation": allocation,
        # "risk": risk_metrics,
    }
