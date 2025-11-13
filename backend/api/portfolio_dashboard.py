from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies.portfolio import get_user_portfolio
from api.watchlist import get_watchlist_companies_for_user
from services.auth.auth import get_current_user
from services.portfolio_positions_service import get_holdings_for_user
from utils.portfolio_utils import parse_as_of_date
from database.base import get_db
from services.portfolio_metrics_service import PortfolioMetricsService

router = APIRouter()
@router.get("/dashboard")
def get_portfolio_dashboard(
    portfolio = Depends(get_user_portfolio),
    user = Depends(get_current_user),
    as_of_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):

    portfolio_id = portfolio.id
    end_date = parse_as_of_date(as_of_date)
    svc = PortfolioMetricsService(db)

    performance = svc.build_performance_summary(
        portfolio_id,
        end_date,
        include_breakdown=False
    )

    holdings = get_holdings_for_user(db, portfolio)  # <-- PASS PORTFOLIO OBJECT
    watchlist = get_watchlist_companies_for_user(db, user)

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "performance": performance,
        "holdings": holdings,
        "watchlist": watchlist,
    }