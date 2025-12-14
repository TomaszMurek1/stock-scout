from typing import List, Optional
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session, joinedload
from database.position import PortfolioPositions
from database.company import Company
from database.stock_data import StockPriceHistory, CompanyMarketData
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
                # Keep as Decimal to avoid precision loss
                ref_prices[cid][p] = close

        # Fetch historical FX rates for periods
        distinct_currencies = set(pos.instrument_currency_code for pos in positions)
        distinct_currencies.discard(portfolio.currency)
        
        ref_fx_rates = {} # { ccy: { '1d': 1.0, ... } }
        
        if distinct_currencies:
            for p in periods:
                sd = period_start_dates.get(p)
                if not sd:
                    continue
                fx_rows = (
                    db.query(FxRate.base_currency, FxRate.close)
                    .filter(
                        FxRate.base_currency.in_(distinct_currencies),
                        FxRate.quote_currency == portfolio.currency,
                        FxRate.date <= sd
                    )
                    .order_by(FxRate.base_currency, FxRate.date.desc())
                    .distinct(FxRate.base_currency)
                    .all()
                )
                for base_ccy, rate in fx_rows:
                    if base_ccy not in ref_fx_rates:
                        ref_fx_rates[base_ccy] = {}
                    # Keep as Decimal
                    ref_fx_rates[base_ccy][p] = rate

    holdings = []
    portfolio_ccy = portfolio.currency

    for pos in positions:
        # Latest market data (Fallback)
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )
        
        # Primary: StockPriceHistory (Matches Breakdown / PVD)
        # Use price from as_of_date or latest available
        # We can assume 'daily refresh' implies we want the recorded close for consistency
        latest_hist: Optional[StockPriceHistory] = (
            db.query(StockPriceHistory)
            .filter(StockPriceHistory.company_id == pos.company_id)
            .order_by(StockPriceHistory.date.desc())
            .first()
        )

        # Use Decimal for current price
        # Priority: History > MarketData > 0
        raw_price = Decimal("0")
        if latest_hist and latest_hist.close is not None:
             raw_price = latest_hist.close
        elif latest_md and latest_md.current_price is not None:
             raw_price = latest_md.current_price
             
        current_price = raw_price if isinstance(raw_price, Decimal) else Decimal(str(raw_price))
        
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
                # Keep as Decimal
                fx_rate_to_portfolio = fx_row.close
                if not isinstance(fx_rate_to_portfolio, Decimal):
                    fx_rate_to_portfolio = Decimal(str(fx_rate_to_portfolio))

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
            
            is_new_position = False
            if first_tx and p_start and first_tx > p_start:
                 # Position is newer than the period window -> Use Net Investment (Cost Basis) 
                 # to calculate PnL contribution.
                 ref_price = float(pos.avg_cost_instrument_ccy)
                 is_new_position = True

            # Use Decimal for calculations to match PortfolioMetricsService and avoid rounding errors
            val = Decimal("0")
            val_instrument = Decimal("0")
            
            # Helper for safe decimal conversion
            def to_d(x): return Decimal(str(x)) if x is not None else Decimal("0")
            
            # Accounting precision: specific to backend storage precision (4 decimals)
            # Using 4 decimals ensures sums match the Breakdown (which uses PVD stored at 4 decimals).
            FOUR_PLACES = Decimal("0.0001")

            d_ref = to_d(ref_price)
            d_curr = to_d(current_price)
            d_qty = to_d(pos.quantity)
            d_fx = to_d(fx_rate_to_portfolio)

            if ref_price is not None and current_price is not None:
                d_diff = d_curr - d_ref
                val_instrument = d_diff * d_qty
                
                if is_new_position:
                    d_avg_port = to_d(pos.avg_cost_portfolio_ccy)
                    
                    # No quantization to allow maximum precision alignment with Breakdown
                    curr_val_base = d_curr * d_qty * d_fx
                    cost_basis_base = d_avg_port * d_qty
                    
                    val = curr_val_base - cost_basis_base
                else:
                    d_hist_fx = Decimal("1.0")
                    if instrument_ccy != portfolio_ccy:
                         # ref_fx_rates holds Decimals or floats (depending on DB driver)
                         raw_fx = ref_fx_rates.get(instrument_ccy, {}).get(p)
                         d_hist_fx = to_d(raw_fx) if raw_fx is not None else d_fx
                    
                    # No quantization
                    curr_val_base = d_curr * d_qty * d_fx
                    hist_val_base = d_ref * d_qty * d_hist_fx
                    
                    val = curr_val_base - hist_val_base
            
            # current_price is Decimal now, but we'll include it in output as float
            # For output, we can cast to float at the end
            # Round to 2 decimals for display consistency
            # Use ROUND_HALF_UP to ensure stable rounding
            quant = Decimal("0.01")
            
            pnl_map[p] = float(val.quantize(quant, rounding=ROUND_HALF_UP))
            pnl_map_instrument[p] = float(val_instrument.quantize(quant, rounding=ROUND_HALF_UP))
        
        # Calculate ITD (Inception to Date) PnL
        current_price_d = to_d(current_price)
        avg_cost_inst_d = to_d(pos.avg_cost_instrument_ccy)
        qty_d = to_d(pos.quantity)
        
        itd_pnl_inst = (current_price_d - avg_cost_inst_d) * qty_d
        pnl_map_instrument["itd"] = float(itd_pnl_inst.quantize(quant, rounding=ROUND_HALF_UP))
        
        current_val_port = current_price_d * qty_d * to_d(fx_rate_to_portfolio)
        cost_basis_port = to_d(pos.avg_cost_portfolio_ccy) * qty_d
        
        pnl_map["itd"] = float((current_val_port - cost_basis_port).quantize(quant, rounding=ROUND_HALF_UP))

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "instrument_ccy": instrument_ccy,
                "average_cost_instrument_ccy": float(pos.avg_cost_instrument_ccy),
                "average_cost_portfolio_ccy": float(pos.avg_cost_portfolio_ccy),
                "last_price": float(current_price),
                "fx_rate_to_portfolio_ccy": float(fx_rate_to_portfolio),
                "period_pnl": pnl_map,
                "period_pnl_instrument_ccy": pnl_map_instrument,
            }
        )



    return holdings