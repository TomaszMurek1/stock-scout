import logging
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import and_, select
from sqlalchemy.orm import Session
from database.models import (
    StockPriceHistory, 
    Company, 
    Market,
    company_market_association
)
from services.stock_data_service import fetch_and_save_stock_data

logger = logging.getLogger(__name__)

def convert_value(value):
    """Convert a numpy scalar to native Python type, if needed."""
    if hasattr(value, "item"):
        return value.item()
    return value

def find_most_recent_golden_cross(
    ticker: str,
    market: str,
    short_window: int = 50,
    long_window: int = 200,
    min_volume: int = 0,
    adjusted: bool = True,
    start_date: datetime = None,
    end_date: datetime = None,
    max_days_since_cross: int = 30,
    db: Session = None
):
    if db is None:
        raise ValueError("Database session 'db' must be provided.")
    if short_window >= long_window:
        logger.error("short_window must be less than long_window.")
        return None

    # 1) Find the market object
    market_obj = db.query(Market).filter(Market.name == market).first()
    if not market_obj:
        logger.error(f"Market {market} not found in DB.")
        return None

    # 2) Find the company
    company_obj = db.query(Company).filter(Company.ticker == ticker).first()
    
    if not company_obj:
        logger.error(f"Company with ticker {ticker} not found in DB.")
        return None
    
    if market_obj not in company_obj.markets:
        logger.error(f"Company {ticker} not in market {market}")
        return None

    # 3) Default date range if not provided
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        days_needed = long_window * 3  # 3x for safety
        start_date = end_date - timedelta(days=days_needed)
    if start_date >= end_date:
        logger.error("start_date must be earlier than end_date.")
        return None
    


    # 4) Ensure data is up to date
    fetch_result = fetch_and_save_stock_data(
        ticker, market, start_date, end_date, db
    )
    if fetch_result['status'] == 'error':
        logger.error(f"Failed to fetch data for {ticker} due to: {fetch_result['message']}")
        return None

    # 5) Load data from stock_price_history
    engine = db.get_bind()
    price_col = StockPriceHistory.adjusted_close if adjusted else StockPriceHistory.close

    query = (
        select(
            StockPriceHistory.date.label('date'),
            price_col.label('close')
        )
        .where(StockPriceHistory.company_id == company_obj.company_id)
        .where(StockPriceHistory.market_id == market_obj.market_id)
        .where(StockPriceHistory.date >= start_date.date())
        .where(StockPriceHistory.date <= end_date.date())
        .order_by(StockPriceHistory.date)
    )

    df = pd.read_sql_query(query, con=engine, parse_dates=['date'])
    df.set_index('date', inplace=True)

    if len(df) < long_window:
        logger.warning(f"Not enough data to calculate {long_window}-day MA for {ticker}.")
        return None

    # 6) Calculate MAs
    df['short_ma'] = df['close'].rolling(window=short_window, min_periods=1).mean()
    df['long_ma'] = df['close'].rolling(window=long_window, min_periods=1).mean()

    df['signal'] = (df['short_ma'] > df['long_ma']).astype(int)
    df['positions'] = df['signal'].diff()

    # Golden cross is when positions == 1
    golden_crosses = df[df['positions'] == 1.0]
    if golden_crosses.empty:
        logger.info(f"No golden cross found for {ticker} in {market}.")
        return None

    # Get most recent cross
    most_recent_cross = golden_crosses.iloc[-1]
    most_recent_date = golden_crosses.index[-1]
    days_since_cross = (end_date.date() - most_recent_date.date()).days

    if max_days_since_cross and (days_since_cross > max_days_since_cross):
        return None

    # 7) Build result
    result = {
        'ticker': ticker,
        'name': company_obj.name,
        'date': most_recent_date.strftime('%Y-%m-%d'),
        'days_since_cross': int(days_since_cross),
        'close': float(most_recent_cross['close']),
        'short_ma': float(most_recent_cross['short_ma']),
        'long_ma': float(most_recent_cross['long_ma']),
    }

    # Convert any numpy scalars to native Python
    result = {k: convert_value(v) for k, v in result.items()}
    return result
