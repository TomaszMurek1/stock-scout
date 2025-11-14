from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies.portfolio import get_user_portfolio
from api.watchlist import get_watchlist_companies_for_user
from services.auth.auth import get_current_user
from services.portfolio_positions_service import get_holdings_for_user
from services.portfolio_transactions_service import get_transactions_for_portfolio
from services.portfolio_valuation_service import get_latest_portfolio_valuation
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
        include_all_breakdowns=False
    )

    holdings = get_holdings_for_user(db, portfolio) 
    watchlist = get_watchlist_companies_for_user(db, user)
    transactions = get_transactions_for_portfolio(db, portfolio_id)
    latest_valuation = get_latest_portfolio_valuation(db, portfolio_id)
    
    return {
        "portfolio": {
            "id": portfolio.id,
            "name": portfolio.name,
            "currency": portfolio.currency,
            "total_invested": latest_valuation["total_invested"] if latest_valuation else 0.0,
            "cash_available": latest_valuation["cash_available"] if latest_valuation else 0.0,
        },
        "as_of_date": end_date.isoformat(),
        "performance": performance,
        "holdings": holdings,
        "watchlist": watchlist,
        "transactions": transactions
    }