from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sqlalchemy import and_, select
from sqlalchemy.orm import Session
from backend.database.models import HistoricalData, Company
from backend.services.stock_data_service import fetch_and_save_stock_data
import logging

logger = logging.getLogger(__name__)

def find_most_recent_golden_cross(ticker: str,
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

    if short_window >= long_window:
        raise ValueError("short_window must be less than long_window")

    # Set end_date to now if not provided
    if end_date is None:
        end_date = datetime.now()

    # Calculate start_date based on long_window if not provided
    if start_date is None:
        # We need enough data for long_window periods, plus extra to account for non-trading days
        days_needed = long_window * 3  # Multiplying by 3 to ensure sufficient data
        start_date = end_date - timedelta(days=days_needed)

    if start_date >= end_date:
        raise ValueError("start_date must be earlier than end_date")

    # Ensure we have up-to-date data without unnecessary API calls
    fetch_result = fetch_and_save_stock_data(ticker, start_date, end_date, db)
    if fetch_result['status'] == 'error':
        logger.error(f"Failed to fetch data for {ticker}: {fetch_result['message']}")
        return None

    # Optimize data fetching using pd.read_sql_query
    engine = db.get_bind()
    adjusted_close_col = HistoricalData.adjusted_close if adjusted else HistoricalData.close

    query = select(
        HistoricalData.date.label('date'),
        adjusted_close_col.label('close'),
        #HistoricalData.volume.label('volume')
    ).select_from(
        HistoricalData.__table__.join(Company.__table__)
    ).where(
        and_(
            Company.ticker == ticker,
            HistoricalData.date >= start_date.date(),
            HistoricalData.date <= end_date.date(),
           #HistoricalData.volume >= min_volume
        )
    ).order_by(HistoricalData.date)

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
        # logger.info(f"The most recent golden cross for {ticker} is older than {max_days_since_cross} days.")
        return None

    # Fetch company name efficiently
    company_name = db.query(Company.name).filter(Company.ticker == ticker).scalar() or 'Unknown'

    return {
        'ticker': ticker,
        'name': company_name,
        'date': most_recent_date.strftime('%Y-%m-%d'),
        'days_since_cross': days_since_cross,
        'close': most_recent_cross['close'],
        'short_ma': most_recent_cross['short_ma'],
        'long_ma': most_recent_cross['long_ma'],
        #'volume': int(most_recent_cross['volume'])
    }