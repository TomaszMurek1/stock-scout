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
                                  db: Session = None):
    
    print('ticker', ticker)

    """
    Finds the most recent golden cross for a given stock ticker.
    If the ticker or historical data is missing, it fetches and saves the stock data.

    Parameters:
        ticker (str): The stock ticker symbol.
        short_window (int): The window size for the short-term moving average.
        long_window (int): The window size for the long-term moving average.
        min_volume (int): Minimum trading volume to filter out low-volume days.
        adjusted (bool): Use adjusted closing prices if True.
        start_date (datetime, optional): Start date for data fetching. Calculated if not provided.
        end_date (datetime, optional): End date for data fetching. Defaults to current date.
        db (Session): SQLAlchemy database session.

    Returns:
        dict or None: Dictionary containing details of the most recent golden cross or None if not found.
    """
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

    try:
        # Check if the company exists in the database
        company = db.query(Company).filter(Company.ticker == ticker).first()
        if not company:
            logger.info(f"Company with ticker {ticker} not found. Fetching data...")
            fetch_and_save_stock_data(ticker, start_date, end_date, db)
            company = db.query(Company).filter(Company.ticker == ticker).first()
            if not company:
                logger.error(f"Failed to fetch and save data for ticker {ticker}")
                return None

        # Check if historical data exists for the date range
        historical_data = db.query(HistoricalData).join(Company).filter(
            and_(
                Company.ticker == ticker,
                HistoricalData.date >= start_date.date(),
                HistoricalData.date <= end_date.date(),
                HistoricalData.volume >= min_volume
            )
        ).order_by(HistoricalData.date).all()

        if not historical_data:
            logger.info(f"No historical data found for ticker {ticker} in the given date range. Fetching data...")
            fetch_result = fetch_and_save_stock_data(ticker, start_date, end_date, db)
            if fetch_result['status'] != 'success' and fetch_result['status'] != 'up_to_date':
                logger.error(f"Failed to fetch data for ticker {ticker}: {fetch_result['message']}")
                return None
            # Fetch the historical data again after fetching
            historical_data = db.query(HistoricalData).join(Company).filter(
                and_(
                    Company.ticker == ticker,
                    HistoricalData.date >= start_date.date(),
                    HistoricalData.date <= end_date.date(),
                    HistoricalData.volume >= min_volume
                )
            ).order_by(HistoricalData.date).all()
            if not historical_data:
                logger.error(f"Historical data for ticker {ticker} could not be retrieved after fetching.")
                return None

        # Proceed with analysis
        # Convert to DataFrame
        data = pd.DataFrame([{
            'date': hd.date,
            'close': hd.adjusted_close if adjusted else hd.close,
            'volume': hd.volume
        } for hd in historical_data])

        data.set_index('date', inplace=True)

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
            logger.info(f"No golden crosses found for ticker {ticker} in the given date range.")
            return None
        else:
            # Get the most recent golden cross
            most_recent_cross = golden_crosses.iloc[-1]
            most_recent_date = golden_crosses.index[-1]
            logger.info(f"Most recent golden cross for ticker {ticker} occurred on {most_recent_date}")
            return {
                'ticker': ticker,
                'date': most_recent_date.strftime('%Y-%m-%d'),
                'close': most_recent_cross['close'],
                'short_ma': most_recent_cross['short_ma'],
                'long_ma': most_recent_cross['long_ma'],
                'volume': most_recent_cross['volume']
            }

    except Exception as e:
        logger.error(f"An error occurred while finding the golden cross for ticker {ticker}: {str(e)}", exc_info=True)
        return None