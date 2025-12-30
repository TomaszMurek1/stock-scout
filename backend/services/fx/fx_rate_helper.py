"""
FX Rate Helper Service

Provides utility functions for fetching and converting currency exchange rates.
"""
from sqlalchemy.orm import Session
from database.fx import FxRate
from datetime import date
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def get_latest_fx_rate(
    db: Session, 
    from_currency: str, 
    to_currency: str = "USD"
) -> float | None:
    """
    Get the most recent FX rate for converting from_currency to to_currency.
    
    Args:
        db: Database session
        from_currency: Base currency (e.g., "PLN")
        to_currency: Quote currency (default "USD")
    
    Returns:
        Latest close rate, or None if not found
        
    Examples:
        >>> get_latest_fx_rate(db, "PLN", "USD")  # Returns 0.25 (1 PLN = $0.25)
        0.25
        >>> get_latest_fx_rate(db, "USD", "USD")  # Same currency
        1.0
    """
    if from_currency == to_currency:
        return 1.0
    
    # Try direct pair: from/to (e.g., PLN/USD)
    rate_record = (
        db.query(FxRate)
        .filter_by(base_currency=from_currency, quote_currency=to_currency)
        .order_by(FxRate.date.desc())
        .first()
    )
    
    if rate_record and rate_record.close:
        logger.debug(f"FX Rate {from_currency}/{to_currency}: {rate_record.close}")
        return rate_record.close
    
    # Try inverse pair: to/from (e.g., USD/PLN) and invert it
    inverse_record = (
        db.query(FxRate)
        .filter_by(base_currency=to_currency, quote_currency=from_currency)
        .order_by(FxRate.date.desc())
        .first()
    )
    
    if inverse_record and inverse_record.close and inverse_record.close != 0:
        inverted_rate = 1.0 / inverse_record.close
        logger.debug(f"FX Rate {from_currency}/{to_currency} (inverted from {to_currency}/{from_currency}): {inverted_rate}")
        return inverted_rate
    
    logger.warning(f"No FX rate found for {from_currency}/{to_currency}")
    return None


def get_fx_rates_batch(
    db: Session,
    currencies: set[str],
    to_currency: str = "USD"
) -> dict[str, float]:
    """
    Fetch FX rates for multiple currencies at once (performance optimization).
    
    Args:
        db: Database session
        currencies: Set of currency codes to convert from
        to_currency: Target currency (default "USD")
    
    Returns:
        Dictionary mapping currency code to exchange rate
        
    Example:
        >>> get_fx_rates_batch(db, {"PLN", "EUR"}, "USD")
        {"PLN": 0.25, "EUR": 1.08}
    """
    rates = {}
    
    for currency in currencies:
        if currency == to_currency:
            rates[currency] = 1.0
        else:
            rate = get_latest_fx_rate(db, currency, to_currency)
            if rate is not None:
                rates[currency] = rate
            # If None, currency won't be in dict (caller should handle missing keys)
    
    return rates


def get_fx_rate_for_date(
    db: Session, 
    from_currency: str, 
    to_currency: str = "USD",
    as_of_date: Optional[date] = None
) -> Optional[float]:
    """
    Get FX rate for a specific date (or latest if None).
    
    Args:
        db: Database session
        from_currency: Source currency code (e.g., 'PLN')
        to_currency: Target currency code (default 'USD')
        as_of_date: Date for the rate (default: today)
    
    Returns:
        Exchange rate as float, or None if not found
        
    Examples:
        >>> get_fx_rate_for_date(db, 'PLN', 'USD', date(2024, 1, 15))
        0.2513  # 1 PLN = 0.2513 USD
    """
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    as_of_date = as_of_date or date.today()
    
    if from_currency == to_currency:
        return 1.0
    
    # Try direct pair (PLN/USD)
    rate = (
        db.query(FxRate.close)
        .filter_by(base_currency=from_currency, quote_currency=to_currency)
        .filter(FxRate.date <= as_of_date)
        .order_by(FxRate.date.desc())
        .first()
    )
    
    if rate and rate[0] is not None:
        return float(rate[0])
    
    # Try inverse pair (USD/PLN), invert the result
    inv_rate = (
        db.query(FxRate.close)
        .filter_by(base_currency=to_currency, quote_currency=from_currency)
        .filter(FxRate.date <= as_of_date)
        .order_by(FxRate.date.desc())
        .first()
    )
    
    if inv_rate and inv_rate[0] is not None and inv_rate[0] != 0:
        return 1.0 / float(inv_rate[0])
    
    logger.warning(
        f"No FX rate found for {from_currency}/{to_currency} as of {as_of_date}"
    )
    return None


def get_fx_rates_batch_for_date(
    db: Session,
    currencies: set[str],
    to_currency: str = "USD",
    as_of_date: Optional[date] = None
) -> dict[str, float]:
    """
    Batch fetch FX rates for multiple currencies as of a specific date.
    
    Args:
        db: Database session
        currencies: Set of currency codes to fetch
        to_currency: Target currency (default 'USD')
        as_of_date: Date for the rates (default: today)
    
    Returns:
        Dictionary mapping currency code -> exchange rate
        
    Examples:
        >>> get_fx_rates_batch_for_date(db, {'PLN', 'EUR', 'GBP'}, 'USD', date(2024, 1, 15))
        {'PLN': 0.2513, 'EUR': 1.0876, 'GBP': 1.2654}
    """
    as_of_date = as_of_date or date.today()
    result = {}
    
    for curr in currencies:
        curr_upper = curr.upper()
        if curr_upper == to_currency.upper():
            result[curr_upper] = 1.0
        else:
            rate = get_fx_rate_for_date(db, curr_upper, to_currency, as_of_date)
            if rate is not None:
                result[curr_upper] = rate
    
    return result
