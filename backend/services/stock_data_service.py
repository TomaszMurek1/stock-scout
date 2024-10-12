import yfinance as yf
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError
from backend.database.models import Company, HistoricalData, Market
import logging
import pandas as pd
import time
import pandas_market_calendars as mcal

logging.basicConfig(level=logging.INFO)
# logging.getLogger('yfinance').setLevel(logging.INFO)
logger = logging.getLogger(__name__)

def retry_on_db_lock(func):
    def wrapper(*args, **kwargs):
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_attempts - 1:
                    logger.warning(f"Database locked. Retrying in {2**attempt} seconds...")
                    time.sleep(2**attempt)
                else:
                    raise
    return wrapper

def get_or_create_company(ticker: str, db: Session) -> Company:
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if company:
        logger.debug(f"Company with ticker {ticker} found in the database.")
        return company

    logger.debug(f"Company with ticker {ticker} not found in the database. Fetching company info from yfinance.")
    stock = yf.Ticker(ticker)
    stock_info = stock.info

    if not stock_info:
        message = f"Could not find company information for ticker {ticker}."
        logger.error(message)
        return None

    # Get or create the market
    exchange_name = stock_info.get('exchange', 'Unknown')
    market = db.query(Market).filter(Market.name == exchange_name).first()
    if not market:
        market = Market(
            name=exchange_name,
            country=stock_info.get('country', 'Unknown'),
            currency=stock_info.get('currency', 'Unknown'),
            timezone=stock_info.get('timeZoneFullName', 'Unknown')
        )
        db.add(market)
        db.commit()
        logger.debug(f"Created new market entry for exchange {exchange_name}.")

    # Create new company entry
    company = Company(
        name=stock_info.get('longName', 'Unknown'),
        ticker=ticker,
        market_id=market.market_id,
        sector=stock_info.get('sector', 'Unknown'),
        industry=stock_info.get('industry', 'Unknown')
    )
    db.add(company)
    db.commit()
    logger.debug(f"Created new company entry for ticker {ticker}.")
    return company

def get_missing_dates(company_id: int, start_date: datetime, end_date: datetime, db: Session) -> (set, set):
    existing_dates_query = db.query(HistoricalData.date).filter(
        HistoricalData.company_id == company_id,
        HistoricalData.date >= start_date.date(),
        HistoricalData.date <= end_date.date()
    ).all()
    existing_dates = set(row[0] for row in existing_dates_query)
    all_dates = set(pd.date_range(start=start_date, end=end_date).date)
    missing_dates = all_dates - existing_dates
    # logger.debug(f"Existing dates: {existing_dates}")
    # logger.debug(f"All dates: {all_dates}")
    # logger.debug(f"Missing dates: {missing_dates}")
    return missing_dates, existing_dates

def fetch_historical_data(ticker: str, missing_dates: set) -> pd.DataFrame:
    if not missing_dates:
        return pd.DataFrame()
    stock = yf.Ticker(ticker)
    missing_start = min(missing_dates)
    missing_end = max(missing_dates) + timedelta(days=1)  # Add one day because end date is exclusive
    stock_data = stock.history(start=missing_start, end=missing_end)
    # logger.debug(f"Fetched data shape: {stock_data.shape}")
    return stock_data

def save_historical_data(company_id: int, stock_data: pd.DataFrame, existing_dates: set, db: Session) -> int:
    records_added = 0
    for index, row in stock_data.iterrows():
        date = index.date()
        if date in existing_dates:
            # logger.debug(f"Record for date {date} already exists. Skipping.")
            continue

        historical_data = HistoricalData(
            company_id=company_id,
            date=date,
            open=row['Open'],
            high=row['High'],
            low=row['Low'],
            close=row['Close'],
            adjusted_close=row.get('Adj Close', row['Close']),
            volume=int(row['Volume'])
        )
        db.add(historical_data)
        records_added += 1

    if records_added > 0:
        try:
            db.commit()
            logger.debug(f"{records_added} new records added to the database.")
        except IntegrityError:
            db.rollback()
            logger.error("IntegrityError during commit. Rolling back.")
            records_added = 0
    else:
        logger.debug("No new records to commit.")
    return records_added

def get_trading_days(start_date: datetime, end_date: datetime, exchange_code: str = 'XWAR') -> set:
    calendar = mcal.get_calendar(exchange_code)
    schedule = calendar.schedule(start_date=start_date.date(), end_date=end_date.date())
    trading_days = set(schedule.index.date)
    return trading_days

def data_is_up_to_date(company_id: int, start_date: datetime, end_date: datetime, db: Session) -> bool:
    # Fetch existing dates from the database
    existing_dates = set(
        row[0] for row in db.query(HistoricalData.date).filter(
            HistoricalData.company_id == company_id,
            HistoricalData.date >= start_date.date(),
            HistoricalData.date <= end_date.date()
        ).all()
    )

    if not existing_dates:
        # No data in the database for this ticker and date range
        return False

    # Generate expected trading days
    trading_days = get_trading_days(start_date, end_date)

    # Identify missing dates
    missing_dates = trading_days - existing_dates
    # If there are missing dates, data is not up-to-date
    return len(missing_dates) == 0

@retry_on_db_lock
def fetch_and_save_stock_data(ticker: str, start_date: datetime, end_date: datetime, db: Session):
    try:
        company = get_or_create_company(ticker, db)
        if not company:
            message = f"Failed to retrieve or create company for ticker {ticker}."
            logger.error(message)
            return {"status": "error", "message": message}

        # Get all missing dates and existing dates not only before start date and after end date but also between them

        # missing_dates, existing_dates = get_missing_dates(company.company_id, start_date, end_date, db)
        # if not missing_dates:
        #     message = f"All data for {ticker} from {start_date.date()} to {end_date.date()} already exists in the database."
        #     logger.info(message)
        #     return {"status": "up_to_date", "message": message}
        
         # Check if data is up-to-date without calling yf.Ticker
        if data_is_up_to_date(company.company_id, start_date, end_date, db):
            message = f"All data for {ticker} from {start_date.date()} to {end_date.date()} already exists in the database."
            #logger.info(message)
            return {"status": "up_to_date", "message": message}


        existing_dates = set(
            row[0] for row in db.query(HistoricalData.date).filter(
                HistoricalData.company_id == company.company_id,
                HistoricalData.date >= start_date.date(),
                HistoricalData.date <= end_date.date()
            ).all()
        )
        exchange_code = 'XWAR'
        # Generate expected trading days
        trading_days = get_trading_days(start_date, end_date, exchange_code)

        # Identify missing dates
        missing_dates = trading_days - existing_dates

        logger.warning(missing_dates)

        if not missing_dates:
            message = f"No missing dates to fetch for {ticker}."
            logger.info(message)
            return {"status": "up_to_date", "message": message}

        stock_data = fetch_historical_data(ticker, missing_dates)
        if stock_data.empty:
            message = f"No new data to save for ticker {ticker}."
            logger.warning(message)
            return {"status": "no_data", "message": message}

        # Pass existing_dates to save_historical_data
        records_added = save_historical_data(company.company_id, stock_data, existing_dates, db)
        if records_added > 0:
            message = f"Data for {ticker} fetched and saved successfully. {records_added} new records added."
            logger.info(message)
            return {"status": "success", "message": message}
        else:
            message = f"No new records added for {ticker}."
            logger.info(message)
            return {"status": "up_to_date", "message": message}

    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error fetching data for {ticker}: {str(e)}", exc_info=True)
        raise

