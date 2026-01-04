from typing import List, Optional, Dict, Any, Set
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone, date
import logging

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database.position import PortfolioPositions
from database.company import Company
from database.stock_data import StockPriceHistory, CompanyMarketData
from database.fx import FxRate
from database.portfolio import Transaction
from services.yfinance_data_update.data_update_service import fetch_and_save_stock_price_history_data_batch
from services.portfolio_metrics_service import PortfolioMetricsService
from services.fx.fx_rate_helper import get_latest_fx_rate, get_fx_rates_batch_for_date

logger = logging.getLogger(__name__)


def _to_d(x: Any) -> Decimal:
    """Helper for safe decimal conversion."""
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _get_raw_positions(db: Session, account_ids: List[int]) -> List[PortfolioPositions]:
    return (
        db.query(PortfolioPositions)
        .options(joinedload(PortfolioPositions.company).joinedload(Company.market))
        .filter(PortfolioPositions.account_id.in_(account_ids))
        .filter(PortfolioPositions.quantity > 0)
        .all()
    )


def _fetch_first_transactions(db: Session, portfolio_id: int, company_ids: List[int]) -> Dict[str, date]:
    """Returns a map of ticker -> first transaction date."""
    first_tx_map = {}
    if not company_ids:
        return first_tx_map

    tx_rows = (
        db.query(Company.ticker, func.min(Transaction.timestamp))
        .join(Transaction.company)
        .filter(Transaction.portfolio_id == portfolio_id)
        .group_by(Company.ticker)
        .all()
    )
    for t, min_ts in tx_rows:
        if min_ts:
            first_tx_map[t] = min_ts.date()
    return first_tx_map


def _fetch_historical_data(
    db: Session, 
    metrics_svc: PortfolioMetricsService, 
    periods: List[str], 
    company_ids: List[int],
    portfolio_currency: str,
    instrument_currencies: Set[str]
) -> tuple[Dict[int, Dict[str, Decimal]], Dict[str, Dict[str, Decimal]], Dict[str, date]]:
    """
    Fetches historical prices and FX rates for the specified periods.
    Returns: (ref_prices, ref_fx_rates, period_start_dates)
    """
    today = date.today()
    period_start_dates = {}
    ref_prices = {}    # { cid: { '1d': Decimal(...), ... } }
    ref_fx_rates = {}  # { ccy: { '1d': Decimal(...), ... } }

    # 1. Calculate start dates
    for p in periods:
        # Dummy portfolio_id=0 as calendar math is generic
        sd = metrics_svc.get_period_start_date(0, today, p)
        if sd:
            period_start_dates[p] = sd

    if not company_ids:
        return ref_prices, ref_fx_rates, period_start_dates

    # 2. Fetch Historical Prices
    for p, sd in period_start_dates.items():
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
            ref_prices[cid][p] = _to_d(close)

    # 3. Fetch Historical FX Rates
    currencies_to_fetch = instrument_currencies - {portfolio_currency}
    if currencies_to_fetch:
        for p, sd in period_start_dates.items():
            fx_rates = get_fx_rates_batch_for_date(db, currencies_to_fetch, portfolio_currency, sd)
            for base_ccy, rate in fx_rates.items():
                if base_ccy not in ref_fx_rates:
                    ref_fx_rates[base_ccy] = {}
                ref_fx_rates[base_ccy][p] = _to_d(rate)

    return ref_prices, ref_fx_rates, period_start_dates



def _get_current_price(db: Session, company_id: int) -> Decimal:
    """
    Determines current price with priority:
    1. StockPriceHistory (Official/Consistent with Breakdown)
    2. CompanyMarketData (Fallback/Live)
    """
    # Primary: StockPriceHistory
    latest_hist: Optional[StockPriceHistory] = (
        db.query(StockPriceHistory)
        .filter(StockPriceHistory.company_id == company_id)
        .order_by(StockPriceHistory.date.desc())
        .first()
    )
    if latest_hist and latest_hist.close is not None:
        return _to_d(latest_hist.close)

    # Fallback: CompanyMarketData
    latest_md: Optional[CompanyMarketData] = (
        db.query(CompanyMarketData)
        .filter_by(company_id=company_id)
        .order_by(CompanyMarketData.last_updated.desc())
        .first()
    )
    if latest_md and latest_md.current_price is not None:
        return _to_d(latest_md.current_price)
        
    return Decimal("0")


def _get_current_fx_rate(db: Session, from_ccy: str, to_ccy: str) -> Decimal:
    """Fetches the latest FX rate between two currencies."""
    rate = get_latest_fx_rate(db, from_ccy, to_ccy)
    return Decimal(str(rate)) if rate else Decimal("1.0")



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
        days_since_friday = today.weekday() - 4
        last_friday = today - timedelta(days=days_since_friday)
        stale_threshold = last_friday.replace(hour=23, minute=59, second=59, microsecond=999999)
        logger.info(f"Weekend mode: Refresh threshold set to last Friday {stale_threshold}")
    else:
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
                    start_date=None, 
                    end_date=None,
                    force_update=False
                )
            except Exception as e:
                logger.error(f"Failed to auto-refresh prices for {market_name}: {e}")


def get_holdings_for_user(db: Session, portfolio) -> List[dict]:
    """
    Returns a list of holdings for the given portfolio with PnL.
    """
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    positions = _get_raw_positions(db, account_ids)
    company_ids = [pos.company_id for pos in positions]
    # Determine authoritative currency for each position (Market > Cached)
    # We map position_id -> currency_code to avoid re-evaluating inside loop
    pos_currency_map = {}
    instrument_currencies = set()
    
    for pos in positions:
        ccy = pos.instrument_currency_code
        if pos.company and pos.company.market and pos.company.market.currency:
            ccy = pos.company.market.currency
        
        pos_currency_map[pos.id] = ccy
        instrument_currencies.add(ccy)

    portfolio_ccy = portfolio.currency
    
    metrics_svc = PortfolioMetricsService(db)
    periods = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd"]
    
    # Pre-fetch Data
    first_tx_map = _fetch_first_transactions(db, portfolio.id, company_ids)
    ref_prices, ref_fx_rates, period_start_dates = _fetch_historical_data(
        db, metrics_svc, periods, company_ids, portfolio_ccy, instrument_currencies
    )
    
    holdings = []
    
    # Output Rounding Configuration
    DISPLAY_QUANT = Decimal("0.01")
    
    for pos in positions:
        current_price = _get_current_price(db, pos.company_id)
        
        # Use determined currency
        inst_ccy = pos_currency_map.get(pos.id, pos.instrument_currency_code)
        
        fx_rate_to_portfolio = _get_current_fx_rate(
            db, inst_ccy, portfolio_ccy
        )
        
        # Calculate PnL for each period
        pnl_map = {}
        pnl_map_instrument = {}
        c_prices = ref_prices.get(pos.company_id, {})
        
        d_curr = _to_d(current_price)
        d_qty = _to_d(pos.quantity)
        d_fx = _to_d(fx_rate_to_portfolio)
        
        for p in periods:
            ref_price_val = c_prices.get(p)
            
            p_start = period_start_dates.get(p)
            first_tx = first_tx_map.get(pos.company.ticker)
            is_new_position = False
            
            # Logic: If acquired after period start, use Cost Basis as Reference
            # CORRECTION for New Positions:
            # If the position was acquired AFTER the period started, using the historical price 
            # at period start yields a hypothetical "Asset Return", not "User Return".
            # To approximate User PnL (matching the Breakdown's Net Purchase logic), 
            # we use Average Cost as the reference price for these new positions.
            if first_tx and p_start and first_tx > p_start:
                 ref_price_val = _to_d(pos.avg_cost_instrument_ccy)
                 is_new_position = True
            
            d_ref = _to_d(ref_price_val)
            val = Decimal("0")
            val_instrument = Decimal("0")
            
            if ref_price_val is not None:
                # Instrument PnL: (Current - Ref) * Qty
                d_diff = d_curr - d_ref
                val_instrument = d_diff * d_qty
                
                # Portfolio PnL
                if is_new_position:
                    # New Position: Compare Current Market Value (PLN) vs Paid Cost Basis (PLN).
                    # This captures PRICE changes + CURRENCY changes on the principal.
                    d_avg_port = _to_d(pos.avg_cost_portfolio_ccy)
                    curr_val_base = d_curr * d_qty * d_fx
                    cost_basis_base = d_avg_port * d_qty
                    val = curr_val_base - cost_basis_base
                else:
                    # Existing Position: Use start-of-period FX rate to capture currency impact on principal.
                    # PnL = (Current Price * Current FX) - (Start Price * Start FX)
                    d_hist_fx = Decimal("1.0")
                    if inst_ccy != portfolio_ccy:
                         raw_fx = ref_fx_rates.get(inst_ccy, {}).get(p)
                         d_hist_fx = _to_d(raw_fx) if raw_fx is not None else d_fx
                    
                    curr_val_base = d_curr * d_qty * d_fx
                    hist_val_base = d_ref * d_qty * d_hist_fx
                    val = curr_val_base - hist_val_base
            
            # Round for display
            pnl_map[p] = float(val.quantize(DISPLAY_QUANT, rounding=ROUND_HALF_UP))
            pnl_map_instrument[p] = float(val_instrument.quantize(DISPLAY_QUANT, rounding=ROUND_HALF_UP))

        # Calculate ITD PnL
        d_avg_cost_inst = _to_d(pos.avg_cost_instrument_ccy)
        
        itd_pnl_inst = (d_curr - d_avg_cost_inst) * d_qty
        pnl_map_instrument["itd"] = float(itd_pnl_inst.quantize(DISPLAY_QUANT, rounding=ROUND_HALF_UP))
        
        d_avg_cost_port = _to_d(pos.avg_cost_portfolio_ccy)
        current_val_port = d_curr * d_qty * d_fx
        cost_basis_port = d_avg_cost_port * d_qty
        
        pnl_map["itd"] = float((current_val_port - cost_basis_port).quantize(DISPLAY_QUANT, rounding=ROUND_HALF_UP))

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "instrument_ccy": inst_ccy,
                "average_cost_instrument_ccy": float(pos.avg_cost_instrument_ccy),
                "average_cost_portfolio_ccy": float(pos.avg_cost_portfolio_ccy),
                "last_price": float(current_price),
                "fx_rate_to_portfolio_ccy": float(fx_rate_to_portfolio),
                "period_pnl": pnl_map,
                "period_pnl_instrument_ccy": pnl_map_instrument,
            }
        )

    return holdings