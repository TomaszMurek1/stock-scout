"""
Company filtering utilities for scan endpoints.

Provides shared filtering logic used across multiple technical analysis scans
(Golden Cross, CHoCH, Breakout, etc.).
"""
import logging
from sqlalchemy.orm import Session
from database.company import Company
from database.market import Market
from database.stock_data import CompanyMarketData

logger = logging.getLogger(__name__)


def filter_by_market_cap(db: Session, companies: list[Company], min_cap_millions: float) -> list[Company]:
    """Filter companies by market cap (in millions USD).
    
    Converts all market caps to USD using latest FX rates for cross-currency comparison.
    
    Args:
        db: Database session
        companies: List of companies to filter
        min_cap_millions: Minimum market cap in millions USD (e.g., 1000 for $1B)
    
    Returns:
        Filtered list of companies meeting the market cap threshold
    """
    if not companies:
        return []
    
    from services.fx.fx_rate_helper import get_fx_rates_batch
    
    min_cap_usd_raw = min_cap_millions * 1_000_000
    comp_ids = [c.company_id for c in companies]
    
    # Get market data with market relationship
    market_data_records = (
        db.query(CompanyMarketData, Company, Market)
        .join(Company, CompanyMarketData.company_id == Company.company_id)
        .join(Market, Company.market_id == Market.market_id)
        .filter(CompanyMarketData.company_id.in_(comp_ids))
        .filter(CompanyMarketData.market_cap.isnot(None))
        .all()
    )
    
    if not market_data_records:
        logger.info(f"Market Cap Filter (USD): No market data found for {len(companies)} companies")
        return []
    
    # Collect unique currencies and fetch FX rates in batch
    currencies = {market.currency for _, _, market in market_data_records if market.currency}
    fx_rates = get_fx_rates_batch(db, currencies, "USD")
    
    valid_id_set = set()
    skipped_count = 0
    
    for market_data, company, market in market_data_records:
        local_market_cap = market_data.market_cap
        currency = market.currency or "USD"
        
        # Convert to USD
        if currency == "USD":
            market_cap_usd = local_market_cap
        else:
            fx_rate = fx_rates.get(currency)
            if fx_rate is None:
                logger.warning(
                    f"No FX rate for {currency}/USD, skipping {company.ticker} (market cap filter)"
                )
                skipped_count += 1
                continue
            market_cap_usd = local_market_cap * fx_rate
        
        # Filter
        if market_cap_usd >= min_cap_usd_raw:
            valid_id_set.add(company.company_id)
    
    filtered = [c for c in companies if c.company_id in valid_id_set]
    logger.info(
        f"Market Cap Filter (USD): {len(companies)} -> {len(filtered)} "
        f"(min ${min_cap_millions}M USD, skipped {skipped_count} due to missing FX rates)"
    )
    return filtered
