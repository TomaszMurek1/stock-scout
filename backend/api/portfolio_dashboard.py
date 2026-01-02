from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.dependencies.portfolio import get_user_portfolio
from api.watchlist import build_watchlist_full_for_user
from services.auth.auth import get_current_user
from services.portfolio_positions_service import get_holdings_for_user, ensure_portfolio_prices_fresh
from services.portfolio_snapshot_service import get_portfolio_snapshot
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
    tx_period: str = Query("1M"),
    db: Session = Depends(get_db),
):
    # Auto-refresh stale prices (older than 1h), protecting against redundant API calls.
    # checking staleness of PRICES
    ensure_portfolio_prices_fresh(db, portfolio)

    from services.valuation.rematerializ import rematerialize_from_tx
    from datetime import date, timedelta
    from database.valuation import PortfolioValuationDaily
    from sqlalchemy import func

    # Optimization: Only rematerialize history once per day to prevent slow loading
    latest_update = db.query(func.max(PortfolioValuationDaily.created_at)).filter(
        PortfolioValuationDaily.portfolio_id == portfolio.id
    ).scalar()

    try:
        # Strategy:
        # 1. Historical Fix (Last 7 Days): Run only ONCE per day (heavy).
        # 2. Current Day Fix: Run EVERY time (durable, fast).
        # If we run the Heavy Sync, it covers Today automatically, so we don't need to run both.
        
        needs_history_sync = not latest_update or latest_update.date() < date.today()
        
        if needs_history_sync:
            # Smart History Sync:
            # 1. Default: Last 7 days (fixes weekends/holidays).
            # 2. Gap Fill: If user was away for 2 weeks, sync from last update.
            # 3. Safety Cap: Max 45 days to avoid timeouts (older history should be stable).
            days_back = 7
            if latest_update:
                gap = (date.today() - latest_update.date()).days
                days_back = max(7, gap + 1)
            else:
                days_back = 30 # Default for new/empty portfolios
                
            days_back = min(days_back, 45)

            rematerialize_from_tx(db, portfolio.id, tx_day=date.today() - timedelta(days=days_back))
        else:
            # Light Sync: Refreshes Today only. Ensures "Now" is up to date with instant trades.
            rematerialize_from_tx(db, portfolio.id, tx_day=date.today())
            
    except Exception as e:
        # Don't break dashboard if valuation fails
        pass

    portfolio_id = portfolio.id
    end_date = parse_as_of_date(as_of_date)
    svc = PortfolioMetricsService(db)

    performance = svc.build_performance_summary(
        portfolio_id,
        end_date,
        include_all_breakdowns=True,
    )

    holdings = get_holdings_for_user(db, portfolio)
    watchlist = build_watchlist_full_for_user(db, user)
    transactions = get_transactions_for_portfolio(db, portfolio_id)

    snapshot = get_portfolio_snapshot(db, portfolio)

    return {
        "portfolio": {
            "id": portfolio.id,
            "name": portfolio.name,
            "currency": portfolio.currency,
            # from snapshot (fallback to 0.0 if no valuation yet)
            "total_value": snapshot["total_value"] if snapshot else 0.0,
            "cash_available": snapshot["cash_available"] if snapshot else 0.0,
            "invested_value_current": snapshot["invested_value_current"] if snapshot else 0.0,
            "net_invested_cash": snapshot["net_invested_cash"] if snapshot else 0.0,
            "accounts": [
                {
                    "id": acc.id,
                    "name": acc.name,
                    "type": acc.account_type,
                    "currency": acc.currency or portfolio.currency,
                    "cash": float(acc.cash)
                }
                for acc in portfolio.accounts
            ]
        },
        "as_of_date": end_date.isoformat(),
        "performance": performance,
        "holdings": holdings,
        "watchlist": watchlist,
        "transactions": transactions,
        "accounts": [
            {
                "id": acc.id,
                "name": acc.name,
                "type": acc.account_type,
                "currency": acc.currency or portfolio.currency,
                "cash": float(acc.cash)
            }
            for acc in portfolio.accounts
        ]
    }
