from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from database.position import PortfolioPositions
from database.company import Company
from database.stock_data import CompanyMarketData
from database.fx import FxRate
from datetime import datetime, timedelta, timezone
from services.yfinance_data_update.data_update_service import fetch_and_save_stock_price_history_data_batch
import logging

logger = logging.getLogger(__name__)


def _get_raw_positions(db: Session, account_ids: List[int]) -> List[PortfolioPositions]:
    return (
        db.query(PortfolioPositions)
        .options(joinedload(PortfolioPositions.company).joinedload(Company.market))
        .filter(PortfolioPositions.account_id.in_(account_ids))
        .all()
    )


def ensure_portfolio_prices_fresh(db: Session, portfolio):
    """
    Checks if the prices for the portfolio's holdings are stale and triggers a batch update if necessary.
    Staleness threshold: 60 minutes.
    """
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return

    positions = _get_raw_positions(db, account_ids)
    if not positions:
        return

    # Group by market
    tickers_by_market = {}
    company_ids = []
    
    for pos in positions:
        if not pos.company or not pos.company.market:
            continue
        
        m_name = pos.company.market.name
        if m_name not in tickers_by_market:
            tickers_by_market[m_name] = []
        
        tickers_by_market[m_name].append(pos.company)
        company_ids.append(pos.company.company_id)

    if not company_ids:
        return

    today = datetime.now(timezone.utc)
    is_weekend = today.weekday() >= 5 # 5=Sat, 6=Sun

    if is_weekend:
        # On weekends, we only need to check if we have data from after Friday close.
        # We assume "Friday Close" global cutoff is roughly Friday end-of-day.
        # If last_updated is after Friday 23:59 UTC, we are good for the whole weekend.
        # Sat (5) - 4 = 1 day ago was Friday. Sun (6) - 4 = 2 days ago was Friday.
        days_since_friday = today.weekday() - 4
        last_friday = today - timedelta(days=days_since_friday)
        # Set threshold to end of Friday (start of Saturday essentially)
        stale_threshold = last_friday.replace(hour=23, minute=59, second=59, microsecond=999999)
        logger.info(f"Weekend mode: Refresh threshold set to last Friday {stale_threshold}")
    else:
        # Weekdays: Refresh if older than 60 minutes
        stale_threshold = today - timedelta(minutes=60)
    
    # Get last_updated for all companies
    md_map = {
        md.company_id: md
        for md in db.query(CompanyMarketData).filter(
            CompanyMarketData.company_id.in_(company_ids)
        ).all()
    }

    for market_name, companies in tickers_by_market.items():
        stale_tickers = []
        for comp in companies:
            md = md_map.get(comp.company_id)
            is_stale = False
            if not md:
                is_stale = True
            elif not md.last_updated:
                is_stale = True
            else:
                last_up = md.last_updated
                if last_up.tzinfo is None:
                    last_up = last_up.replace(tzinfo=timezone.utc)
                if last_up < stale_threshold:
                    is_stale = True
            
            if is_stale:
                stale_tickers.append(comp.ticker)
        
        if stale_tickers:
            logger.info(f"Triggering batch update for {len(stale_tickers)} stale tickers in {market_name}")
            try:
                fetch_and_save_stock_price_history_data_batch(
                    tickers=stale_tickers,
                    market_name=market_name,
                    db=db,
                    start_date=None, # Auto-determine (last 100 days default)
                    end_date=None,
                    force_update=False
                )
            except Exception as e:
                logger.error(f"Failed to auto-refresh prices for {market_name}: {e}")


def get_holdings_for_user(db: Session, portfolio) -> List[dict]:
    """
    Returns a list of holdings for the given portfolio:
    [
        {
            "ticker": "AAPL",
            "name": "Apple",
            "shares": ...,
            "instrument_ccy": "USD",
            "average_cost_instrument_ccy": ...,
            "average_cost_portfolio_ccy": ...,
            "last_price": ...,
            "fx_rate_to_portfolio_ccy": 1.0 or last FX rate
        }
    ]
    """

    # 1. Collect all accounts for this portfolio
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    # 2. Fetch positions
    positions = _get_raw_positions(db, account_ids)

    # 3. Calculate PnL for multiple periods
    from datetime import date
    from services.portfolio_metrics_service import PortfolioMetricsService
    from database.stock_data import StockPriceHistory
    from database.portfolio import Transaction
    from database.company import Company
    from sqlalchemy import func
    
    # We used today as end_date for PnL "To Date"
    
    today = date.today()
    metrics_svc = PortfolioMetricsService(db)
    periods = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd"]
    
    # Map: company_id -> period -> start_price
    ref_prices = {} # { cid: { '1d': 100, '1m': 90 } }
    period_start_dates = {} # { '1d': date... }

    company_ids = [pos.company_id for pos in positions]
    
    # Get first transaction date per ticker to identify "New Positions"
    first_tx_map = {}
    if company_ids:
        tx_rows = (
            db.query(Company.ticker, func.min(Transaction.timestamp))
            .join(Transaction.company)
            .filter(Transaction.portfolio_id == portfolio.id)
            .group_by(Company.ticker)
            .all()
        )
        for t, min_ts in tx_rows:
            if min_ts:
                first_tx_map[t] = min_ts.date()

        for p in periods:
            # We use dummy portfolio_id=0 because get_period_start_date logic for these periods 
            # (except ITD) doesn't depend on portfolio transactions, just calendar math.
            sd = metrics_svc.get_period_start_date(0, today, p)
            if not sd:
                continue
            period_start_dates[p] = sd
            
            # Find first available price on or after start date
            # Optimization: could combine in one query but loop of 7 is fine.
            # Distinct on company_id to get first
            rows = (
                db.query(StockPriceHistory.company_id, StockPriceHistory.close)
                .filter(
                    StockPriceHistory.company_id.in_(company_ids),
                    StockPriceHistory.date <= sd
                )
                .order_by(StockPriceHistory.company_id, StockPriceHistory.date.desc())
                .distinct(StockPriceHistory.company_id)
                .all()
            )
            
            for cid, close in rows:
                if cid not in ref_prices:
                    ref_prices[cid] = {}
                ref_prices[cid][p] = float(close)

    holdings = []
    portfolio_ccy = portfolio.currency

    for pos in positions:
        # Latest market data
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )

        current_price = (
            float(latest_md.current_price)
            if latest_md and latest_md.current_price is not None
            else 0.0
        )
        
        # Determine FX rate instrument -> portfolio CCY
        instrument_ccy = pos.instrument_currency_code
        fx_rate_to_portfolio = 1.0

        if instrument_ccy != portfolio_ccy:
            fx_row: Optional[FxRate] = (
                db.query(FxRate)
                .filter_by(
                    base_currency=instrument_ccy,
                    quote_currency=portfolio_ccy,
                )
                .order_by(FxRate.date.desc())
                .first()
            )
            if fx_row:
                fx_rate_to_portfolio = float(fx_row.close)

        # Calculate PnL for each period
        pnl_map = {}
        pnl_map_instrument = {}
        c_prices = ref_prices.get(pos.company_id, {})
        
        for p in periods:
            ref_price = c_prices.get(p)
            
            # CORRECTION for New Positions:
            # If the position was acquired AFTER the period started, using the historical price 
            # at period start yields a hypothetical "Asset Return", not "User Return".
            # To approximate User PnL (matching the Breakdown's Net Purchase logic), 
            # we use Average Cost as the reference price for these new positions.
            p_start = period_start_dates.get(p)
            first_tx = first_tx_map.get(pos.company.ticker)
            
            if first_tx and p_start and first_tx > p_start:
                 # Position is newer than the period window -> Use Net Investment (Cost Basis) 
                 # to calculate PnL contribution.
                 ref_price = float(pos.avg_cost_instrument_ccy)

            val = 0.0
            val_instrument = 0.0
            if ref_price and current_price:
                diff = current_price - ref_price
                val_instrument = diff * float(pos.quantity)
                val = val_instrument * fx_rate_to_portfolio
            pnl_map[p] = val
            pnl_map_instrument[p] = val_instrument
        
        # Calculate ITD (Inception to Date) PnL
        # Instrument CCY: (Current Price - Avg Cost) * Shares
        itd_pnl_inst = (current_price - float(pos.avg_cost_instrument_ccy)) * float(pos.quantity)
        pnl_map_instrument["itd"] = itd_pnl_inst
        
        # Portfolio CCY: Current Value - Cost Basis
        # Current Value = Price * Shares * Current FX
        current_val_port = current_price * float(pos.quantity) * fx_rate_to_portfolio
        # Cost Basis = Avg Cost (Portfolio) * Shares
        cost_basis_port = float(pos.avg_cost_portfolio_ccy) * float(pos.quantity)
        
        pnl_map["itd"] = current_val_port - cost_basis_port

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "instrument_ccy": instrument_ccy,
                "average_cost_instrument_ccy": float(pos.avg_cost_instrument_ccy),
                "average_cost_portfolio_ccy": float(pos.avg_cost_portfolio_ccy),
                "last_price": current_price,
                "fx_rate_to_portfolio_ccy": fx_rate_to_portfolio,
                "period_pnl": pnl_map,
                "period_pnl_instrument_ccy": pnl_map_instrument,
            }
        )



    return holdings