from datetime import datetime
import pandas as pd
from sqlalchemy.orm import Session
from backend.database.models import HistoricalData, Company
import logging
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import and_

from backend.services.stock_data_service import fetch_and_save_stock_data

logger = logging.getLogger(__name__)

def find_most_recent_golden_cross(ticker: str,
                                  short_window: int = 50,
                                  long_window: int = 200,
                                  min_volume: int = 1000000,
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
    fetch_and_save_stock_data(ticker, start_date, end_date, db)
    historical_data = db.query(HistoricalData).join(Company).filter(
            and_(
                Company.ticker == ticker,
                HistoricalData.date >= start_date.date(),
                HistoricalData.date <= end_date.date(),
            )
        ).order_by(HistoricalData.date).all()
   
    # Proceed with analysis
    # Convert to DataFrame
    data = pd.DataFrame([{
        'date': hd.date,
        'close': hd.adjusted_close if adjusted else hd.close,
        'volume': hd.volume
    } for hd in historical_data])

    data.set_index('date', inplace=True)

    # logger.info(f"Retrieved {len(data)} data points for ticker {ticker}")
    # logger.info(f"Date range: {data.index.min()} to {data.index.max()}")

    # Ensure there are enough data points
    if len(data) < long_window:
        logger.warning(f"Not enough data to calculate the long-term moving average for ticker {ticker}.")
        return None

    # Calculate moving averages
    data['short_ma'] = data['close'].rolling(window=short_window).mean()
    data['long_ma'] = data['close'].rolling(window=long_window).mean()

    # Identify golden crosses
    data['signal'] = 0
    data['signal'] = np.where(data['short_ma'] > data['long_ma'], 1.0, 0.0)
    data['positions'] = data['signal'].diff()

    # Extract the most recent golden cross
    golden_crosses = data[data['positions'] == 1.0]

    if golden_crosses.empty:
        return None
    else:
        # Get the most recent golden cross
        most_recent_cross = golden_crosses.iloc[-1]
        most_recent_date = golden_crosses.index[-1]
        days_since_cross = (end_date.date() - most_recent_date).days

        if max_days_since_cross is not None and days_since_cross > max_days_since_cross:
            return None

        company = db.query(Company).filter(Company.ticker == ticker).first()
        
        return {
            'ticker': ticker,
            'name': company.name,
            'date': most_recent_date.strftime('%Y-%m-%d'),
            'days_since_cross': days_since_cross,
            'close': most_recent_cross['close'],
            'short_ma': most_recent_cross['short_ma'],
            'long_ma': most_recent_cross['long_ma'],
            'volume': most_recent_cross['volume']
        }
