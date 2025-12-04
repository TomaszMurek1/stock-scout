import logging
from typing import List, Dict
import yfinance as yf
from yfinance import EquityQuery

logger = logging.getLogger(__name__)

# Mapping broad or common Yahoo codes to valid Screener exchange codes.
# Derived from yfinance.screener.query.EquityQuery valid_values
SCREENER_EXCHANGE_MAPPING: Dict[str, List[str]] = {
    "NASDAQ": ["NMS", "NGM", "NCM"],
    "NAS": ["NMS", "NGM", "NCM"],
    "NMS": ["NMS"],
    "NCM": ["NCM"],
    
    "NYSE": ["NYQ"],
    "NYQ": ["NYQ"],
    
    "AMEX": ["ASE"],
    "ASE": ["ASE"],
    "XASE": ["ASE"],

    "LSE": ["LSE"],
    "LSEG": ["LSE"],
    "LON": ["LSE"],
    "XLON": ["LSE"],
    
    "PAR": ["PAR"],
    "XPAR": ["PAR"],
    
    "TOR": ["TOR"],
    "TSX": ["TOR"], # Yahoo uses TOR for Toronto? Valid value check: TOR
    "XTSX": ["TOR"],
    
    "AMS": ["AMS"], # Amsterdam
    "BRU": ["BRU"], # Brussels
    "LIS": ["LIS"], # Lisbon
    "VIE": ["VIE"], # Vienna
    "HEL": ["HEL"], # Helsinki
    "CPH": ["CPH"], # Copenhagen
    "OSL": ["OSL"], # Oslo
    "STO": ["STO"], # Stockholm
    "IST": ["IST"], # Istanbul
    
    "HKG": ["HKG"],
    "JPX": ["JPX"],
}

def fetch_tickers_by_market(market_code: str) -> List[str]:
    """
    Fetches a list of tickers for a given market using yfinance Screener.
    
    Args:
        market_code: The Yahoo exchange code (e.g., "NMS", "NASDAQ", "PAR").
    
    Returns:
        List of ticker symbols.
        
    Raises:
        ValueError: If the market code is invalid for the screener.
        Exception: For other API errors.
    """
    # Resolve target exchanges
    target_exchanges = SCREENER_EXCHANGE_MAPPING.get(market_code, [market_code])
    
    logger.info(f"Fetching tickers for market: {market_code} (targets: {target_exchanges})")

    # Build Query
    try:
        if len(target_exchanges) > 1:
            q = EquityQuery('is-in', ['exchange', *target_exchanges])
        else:
            q = EquityQuery('eq', ['exchange', target_exchanges[0]])
    except Exception as e:
        logger.error(f"Failed to build EquityQuery for {market_code}: {e}")
        raise ValueError(f"Invalid market code for screener: {market_code}") from e

    all_symbols = []
    offset = 0
    page_size = 250  # Max allowed by Yahoo
    total_found = 0

    while True:
        try:
            response = yf.screen(q, offset=offset, size=page_size, sortField='ticker', sortAsc=True)
        except Exception as e:
            logger.error(f"yfinance screen failed at offset {offset}: {e}")
            # If we have some results, maybe return them? Or raise?
            # Raising ensures we don't return partial data silently if first page fails.
            if offset == 0:
                 raise e
            break

        quotes = response.get('quotes', [])
        total_available = response.get('total', 0)
        
        if not quotes:
            break
            
        current_batch = [q['symbol'] for q in quotes if 'symbol' in q]
        all_symbols.extend(current_batch)
        
        total_found += len(current_batch)
        logger.debug(f"Fetched {len(current_batch)} symbols (Total: {total_found}/{total_available})")
        
        if total_found >= total_available:
            break
            
        # Preparation for next page
        offset += page_size
        
        # Safety break for extremely large results to avoid infinite loops
        if offset > 10000:
            logger.warning("Reached safety limit of 10000 tickers. Stopping.")
            break
            
    logger.info(f"Finished fetching for {market_code}. Total unique symbols: {len(all_symbols)}")
    return all_symbols
