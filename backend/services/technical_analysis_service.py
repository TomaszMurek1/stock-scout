from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import and_, select
from sqlalchemy.orm import Session
from database.models import HistoricalDataSP500, HistoricalDataWSE, HistoricalDataCAC, Company
from services.stock_data_service import fetch_and_save_stock_data
import logging

logger = logging.getLogger(__name__)

def find_most_recent_golden_cross(ticker: str,
                                  market: str,  # New parameter for the market
                                  short_window: int = 50,
                                  long_window: int = 200,
                                  min_volume: int = 0,
                                  adjusted: bool = True,
                                  start_date: datetime = None,
                                  end_date: datetime = None,
                                  max_days_since_cross: int = 30,
                                  db: Session = None):
    if db is None:
        raise ValueError("Database session 'db' must be provided.")
    
    # Mapping of market names to their historical data tables
    market_table_map = {
        'GSPC': HistoricalDataSP500,
        'WSE': HistoricalDataWSE,
        'CAC': HistoricalDataCAC,
        # Add other markets as needed
    }

    if market not in market_table_map:
        logger.error(f"Market {market} is not supported.")
        return None

    # Get the correct historical data table class
    HistoricalDataTable = market_table_map[market]

    if short_window >= long_window:
        logger.error("short_window must be less than long_window")
        return None

    # Set end_date to now if not provided
    if end_date is None:
        end_date = datetime.now()

    # Calculate start_date based on long_window if not provided
    if start_date is None:
        # We need enough data for long_window periods, plus extra to account for non-trading days
        days_needed = long_window * 3  # Multiplying by 3 to ensure sufficient data
        start_date = end_date - timedelta(days=days_needed)

    if start_date >= end_date:
        logger.error("start_date must be earlier than end_date")
        return None

    # Ensure we have up-to-date data without unnecessary API calls
    fetch_result = fetch_and_save_stock_data(ticker, start_date, end_date, db, market)
    if fetch_result['status'] == 'error':
        logger.error(f"Failed to fetch data for {ticker}: {fetch_result['message']}")
        return None

    # Optimize data fetching using pd.read_sql_query
    engine = db.get_bind()
    adjusted_close_col = HistoricalDataTable.adjusted_close if adjusted else HistoricalDataTable.close

    query = select(
        HistoricalDataTable.date.label('date'),
        adjusted_close_col.label('close'),
        # HistoricalDataTable.volume.label('volume')
    ).select_from(
        HistoricalDataTable.__table__.join(Company.__table__)
    ).where(
        and_(
            Company.ticker == ticker,
            HistoricalDataTable.date >= start_date.date(),
            HistoricalDataTable.date <= end_date.date(),
            # HistoricalDataTable.volume >= min_volume
        )
    ).order_by(HistoricalDataTable.date)

    data = pd.read_sql_query(query, con=engine, parse_dates=['date'])
    data.set_index('date', inplace=True)

    # Ensure there are enough data points
    if len(data) < long_window:
        logger.warning(f"Not enough data to calculate the long-term moving average for ticker {ticker}.")
        return None

    # Calculate moving averages
    data['short_ma'] = data['close'].rolling(window=short_window, min_periods=1).mean()
    data['long_ma'] = data['close'].rolling(window=long_window, min_periods=1).mean()

    # Identify golden crosses
    data['signal'] = (data['short_ma'] > data['long_ma']).astype(int)
    data['positions'] = data['signal'].diff()

    # Extract the most recent golden cross
    golden_crosses = data[data['positions'] == 1.0]

    if golden_crosses.empty:
        logger.info(f"No golden cross found for {ticker} in the specified date range.")
        return None

    # Get the most recent golden cross
    most_recent_cross = golden_crosses.iloc[-1]
    most_recent_date = golden_crosses.index[-1]
    days_since_cross = (end_date.date() - most_recent_date.date()).days

    if max_days_since_cross is not None and days_since_cross > max_days_since_cross:
        return None

    # Fetch company name efficiently
    company_name = db.query(Company.name).filter(Company.ticker == ticker).first()
    company_name = company_name[0] if company_name else 'Unknown'

    return {
        'ticker': ticker,
        'name': company_name,
        'date': most_recent_date.strftime('%Y-%m-%d'),
        'days_since_cross': days_since_cross,
        'close': most_recent_cross['close'],
        'short_ma': most_recent_cross['short_ma'],
        'long_ma': most_recent_cross['long_ma'],
        # 'volume': int(most_recent_cross['volume'])
    }
