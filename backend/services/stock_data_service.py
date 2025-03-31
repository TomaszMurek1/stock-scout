import yfinance as yf
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError
from database.company import Company
from database.stock_data import  StockPriceHistory
from database.market import Market
import logging
import pandas as pd
import time
import pandas_market_calendars as mcal
from sqlalchemy.exc import IntegrityError
from datetime import date

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retry_on_db_lock(func):
    """Simple retry decorator in case the DB is locked."""
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
    """Fetch a company by ticker, or create if not found."""
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if company:
        return company

    # If not found, try to fetch info from Yahoo
    logger.info(f"Company {ticker} not found in DB; fetching from yfinance.")
    stock = yf.Ticker(ticker)
    stock_info = stock.info or {}
    if not stock_info:
        logger.error(f"No company info found for ticker {ticker}.")
        return None

    company = Company(
        name=stock_info.get('longName', 'Unknown'),
        ticker=ticker,
        sector=stock_info.get('sector', 'Unknown'),
        industry=stock_info.get('industry', 'Unknown')
    )
    db.add(company)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"Integrity error creating company {ticker}: {exc}")
        return None
    return company

def get_or_create_market(market_name: str, db: Session) -> Market:
    """Fetch a market by name, or create if not found."""
    market_obj = db.query(Market).filter_by(name=market_name).first()
    if market_obj:
        return market_obj
    logger.info(f"Market {market_name} not found; creating new Market entry.")
    market_obj = Market(name=market_name, country='Unknown', currency='Unknown', timezone='Unknown')
    db.add(market_obj)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"Integrity error creating market {market_name}: {exc}")
        return None
    return market_obj

def get_trading_days(start_date: datetime, end_date: datetime, exchange_code: str) -> set:
    """
    Returns a set of trading days (dates) between start_date and end_date
    using the provided exchange_code (NY, WAR, PAR, etc.).
    """
    calendar = mcal.get_calendar(exchange_code)
    schedule = calendar.schedule(start_date=start_date.date(), end_date=end_date.date())
    return set(schedule.index.date)

def data_is_up_to_date(company_id: int, market_id: int, start_date: datetime, end_date: datetime, db: Session, exchange_code: str) -> bool:
    existing_dates = set(
        r[0] for r in db.query(StockPriceHistory.date)
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.market_id == market_id)
        .filter(StockPriceHistory.date >= start_date.date())
        .filter(StockPriceHistory.date <= end_date.date())
        .all()
    )

    if not existing_dates:
        return False

    trading_days = get_trading_days(start_date, end_date, exchange_code)
    remove_date = date(2025, 1, 9)  # US president funeral, not included in Calendar for 2025

    if exchange_code == "XNYS" and remove_date in trading_days:
        trading_days.remove(remove_date)

    missing = trading_days - existing_dates
    return len(missing) == 0

@retry_on_db_lock
def fetch_and_save_stock_history_data(ticker: str, market_name: str, start_date: datetime, end_date: datetime, db: Session):
    """
    Fetch historical data from yfinance for (ticker, market_name) between start_date and end_date,
    and insert into stock_price_history. 
    """
    try:
        # 1) Get or create the Company
        company = get_or_create_company(ticker, db)
        if not company:
            msg = f"Could not retrieve/create company with ticker {ticker}."
            return {"status": "error", "message": msg}

        # 2) Get or create the Market
        market_obj = get_or_create_market(market_name, db)

        # 3) Optional: define exchange_code for holiday calendars
        #    This is a mapping you must define yourself:
        exchange_code_map = {
            'GSPC': 'XNYS',    # S&P 500
            'DJI': 'XNYS',     # Dow Jones
            'WSE': 'XWAR',     # Warsaw
            'CAC': 'XPAR',     # Paris
            'NDX': 'XNYS',     # Nasdaq (technically 'XNAS')
            # etc...
        }
        exchange_code = exchange_code_map.get(market_name, 'XNYS')  # fallback

        # 4) Check if data is already up to date
        if data_is_up_to_date(company.company_id, market_obj.market_id, start_date, end_date, db, exchange_code):
            msg = f"All data for {ticker} in market {market_name} from {start_date.date()} to {end_date.date()} is already up to date."
            return {"status": "up_to_date", "message": msg}

        # 5) Determine the trading days
        trading_days = get_trading_days(start_date, end_date, exchange_code)


        remove_date = date(2025, 1, 9) #US president funeral
        if exchange_code == "XNYS" and remove_date in trading_days:
            trading_days.remove(remove_date)
        # 6) Find which dates we already have
        existing_dates = set(
            r[0] for r in db.query(StockPriceHistory.date)
            .filter(StockPriceHistory.company_id == company.company_id)
            .filter(StockPriceHistory.market_id == market_obj.market_id)
            .filter(StockPriceHistory.date >= start_date.date())
            .filter(StockPriceHistory.date <= end_date.date())
            .all()
        )

        # 7) Missing dates are the trading days minus existing
        missing_dates = trading_days - existing_dates
        if not missing_dates:
            msg = f"No missing dates for {ticker}, market={market_name}."
            return {"status": "up_to_date", "message": msg}

        # 8) Fetch from yfinance
        #    Because yfinance fetches in a range, figure out min/max needed
        fetch_start = min(missing_dates)
        fetch_end = max(missing_dates) + timedelta(days=1)  # end is exclusive in yfinance
        ticker = ticker.strip()
        stock = yf.Ticker(ticker)
        stock_data = stock.history(start=fetch_start, end=fetch_end)

        if stock_data.empty:
            msg = f"No data returned from yfinance for {ticker} in range {fetch_start} to {fetch_end}."
            return {"status": "no_data", "message": msg}

        # 9) Insert new rows
        new_records = 0
        for idx, row in stock_data.iterrows():
            date_obj = idx.date()
            # Insert only if it's in our missing_dates set
            if date_obj not in missing_dates:
                continue

            record = StockPriceHistory(
                company_id=company.company_id,
                market_id=market_obj.market_id,
                date=date_obj,
                open=float(row['Open']),
                high=float(row['High']),
                low=float(row['Low']),
                close=float(row['Close']),
                adjusted_close=float(row.get('Adj Close', row['Close'])),
                volume=int(row['Volume'])
            )
            db.add(record)
            new_records += 1

        if new_records > 0:
            try:
                db.commit()
                msg = f"{new_records} new records added for {ticker}, market={market_name}."
                logger.info(msg)
                return {"status": "success", "message": msg}
            except IntegrityError as exc:
                db.rollback()
                msg = f"Integrity error while inserting {ticker} data: {exc}"
                logger.error(msg)
                return {"status": "error", "message": msg}
        else:
            msg = f"No new records to add for {ticker}, market={market_name}."
            logger.info(msg)
            return {"status": "up_to_date", "message": msg}

    except Exception as e:
        db.rollback()
        msg = f"Unexpected error fetching data for {ticker}, market={market_name}: {e}"
        logger.error(msg, exc_info=True)
        return {"status": "error", "message": msg}
