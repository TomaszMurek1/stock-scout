"""
FX Rate Helper Service

Provides utility functions for fetching and converting currency exchange rates.
"""
from sqlalchemy.orm import Session
from database.fx import FxRate
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
