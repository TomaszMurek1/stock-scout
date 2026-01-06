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
from database.alert import Alert
from decimal import Decimal


router = APIRouter()

from fastapi import APIRouter, Depends, Query, BackgroundTasks

@router.get("/dashboard/core")
def get_portfolio_dashboard_core(
    background_tasks: BackgroundTasks,
    portfolio = Depends(get_user_portfolio),
    user = Depends(get_current_user),
    as_of_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # Auto-refresh stale prices (older than 1h), protecting against redundant API calls.
    # checking staleness of PRICES
    ensure_portfolio_prices_fresh(db, portfolio, background_tasks)

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
    # CORE: No performance service call here

    holdings = get_holdings_for_user(db, portfolio)
    watchlist = build_watchlist_full_for_user(db, user)
    transactions = get_transactions_for_portfolio(db, portfolio_id)
    alerts = db.query(Alert).filter(Alert.user_id == user.id).all()

    snapshot = get_portfolio_snapshot(db, portfolio)

    # Simplified net_invested_cash until performance loads ITD
    # Or calculate partial ITD flow here if fast?
    # For speed, we stick to snapshot, which should be accurate enough for "Total Cash Invested"
    # The original code preferred performance breakdown ITD.
    # We can fetch ITD stats separately if needed, but snapshot is fine.
    
    return {
        "portfolio": {
            "id": portfolio.id,
            "name": portfolio.name,
            "currency": portfolio.currency,
            "total_value": snapshot["total_value"] if snapshot else 0.0,
            "cash_available": snapshot["cash_available"] if snapshot else 0.0,
            "invested_value_current": snapshot["invested_value_current"] if snapshot else 0.0,
            "net_invested_cash": snapshot["net_invested_cash"] if snapshot else 0.0, 
            "net_deposits": snapshot["net_deposits"] if snapshot else 0.0,
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
        # Performance is omitted or empty
        "performance": {}, 
        "holdings": holdings,
        "watchlist": watchlist,
        "transactions": transactions,
        "alerts": alerts,
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


@router.get("/dashboard/performance")
def get_portfolio_dashboard_performance(
    portfolio = Depends(get_user_portfolio),
    as_of_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    portfolio_id = portfolio.id
    end_date = parse_as_of_date(as_of_date)
    svc = PortfolioMetricsService(db)

    # --- Live Value Override Logic ---
    # 1. Fetch current holdings (with latest prices)
    holdings = get_holdings_for_user(db, portfolio)
    
    # 2. Sum invested value (Live)
    # Holdings already contain price * quantity * fx logic in `period_pnl` calculation or we recompute?
    # get_holdings_for_user returns dicts. Let's recompute safe total.
    live_invested = sum(
        Decimal(str(h["shares"])) * 
        Decimal(str(h["last_price"])) * 
        Decimal(str(h["fx_rate_to_portfolio_ccy"])) 
        for h in holdings
    )
    
    # 3. Sum cash (Real-time from accounts)
    live_cash = sum(Decimal(str(a.cash)) for a in portfolio.accounts)
    
    # 4. Total Live Value
    live_total_value = live_invested + live_cash
    
    # 5. Live PnL Map (Sum of period_pnl from holdings)
    live_pnl_map = {}
    # We exclude 'itd' from PnL override because ITD PnL includes realized history 
    # which is NOT in the holdings table. Forcing it to match table causes 
    # math artifacts (phantom 'starting investment').
    PERIODS_TO_SUM = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd"]
    
    # Initialize
    for p in PERIODS_TO_SUM:
        live_pnl_map[p] = Decimal("0")
        
    for h in holdings:
        ppnl = h.get("period_pnl", {})
        for p in PERIODS_TO_SUM:
            val = ppnl.get(p)
            if val is not None:
                live_pnl_map[p] += Decimal(str(val))

    overrides = {
        "total_value": live_total_value,
        "cash_val": live_cash,
        "period_pnl_map": live_pnl_map
    }

    # This is the heavy part
    performance = svc.build_performance_summary(
        portfolio_id,
        end_date,
        include_all_breakdowns=True,
        current_values_override=overrides
    )
    
    return {
        "portfolio_id": portfolio_id,
        "performance": performance
    }


# Backwards compatibility (Deprecate soon)
@router.get("/dashboard")
def get_portfolio_dashboard_legacy(
    portfolio = Depends(get_user_portfolio),
    user = Depends(get_current_user),
    as_of_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    # Call core
    core = get_portfolio_dashboard_core(portfolio, user, as_of_date, db)
    
    # Call performance
    perf_resp = get_portfolio_dashboard_performance(portfolio, as_of_date, db)
    
    # Merge
    core["performance"] = perf_resp["performance"]
    
    # Correction for net_invested_cash if possible
    itd = perf_resp["performance"].get("breakdowns", {}).get("itd", {}).get("cash_flows", {}).get("net_external")
    if itd:
        core["portfolio"]["net_invested_cash"] = itd
        
    return core
