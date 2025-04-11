from sqlalchemy import func
import yfinance as yf
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import  IntegrityError
from database.stock_data import  StockPriceHistory
import logging
import pandas_market_calendars as mcal
from sqlalchemy.exc import IntegrityError
from datetime import date
from services.company.company_service import get_or_create_company
from services.market.market_service import get_or_create_market
from services.utils.db_retry import retry_on_db_lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_trading_days(start_date: datetime, end_date: datetime, exchange_code: str) -> set:
    """
    Returns a set of trading days (dates) between start_date and end_date
    using the provided exchange_code (NY, WAR, PAR, etc.).
    """
    calendar = mcal.get_calendar(exchange_code)
    schedule = calendar.schedule(start_date=start_date.date(), end_date=end_date.date())
    return set(schedule.index.date)

def get_last_trading_day(exchange_code: str, up_to_date: date) -> date:
    """Returns the last trading day on or before `up_to_date` for the given exchange."""
    calendar = mcal.get_calendar(exchange_code)
    # Check a window of 7 days to account for weekends/holidays
    start_date = up_to_date - timedelta(days=7)
    schedule = calendar.schedule(start_date=start_date, end_date=up_to_date)
    if schedule.empty:
        return None
    return schedule.index[-1].date()

def data_is_up_to_date(
    company_id: int,
    market_id: int,
    start_date: datetime,
    end_date: datetime,
    db: Session,
    exchange_code: str
) -> bool:
    # 1. Check if all trading days in the original range are present
    existing_dates = set(
        r[0] for r in db.query(StockPriceHistory.date)
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.market_id == market_id)
        .filter(StockPriceHistory.date >= start_date.date())
        .filter(StockPriceHistory.date <= end_date.date())
        .all()
    )

    trading_days_in_range = get_trading_days(start_date, end_date, exchange_code)
    remove_date = date(2025, 1, 9)  # Example non-trading day
    if exchange_code == "XNYS" and remove_date in trading_days_in_range:
        trading_days_in_range.remove(remove_date)
    
    missing_in_range = trading_days_in_range - existing_dates
    if missing_in_range:
        return False  # Missing days in the original range

    # 2. Check if the latest date in DB matches the last possible trading day
    latest_db_date = db.query(func.max(StockPriceHistory.date))\
        .filter(StockPriceHistory.company_id == company_id)\
        .filter(StockPriceHistory.market_id == market_id)\
        .scalar()

    if not latest_db_date:
        return False  # No data exists

    # Get the last trading day up to today
    today = datetime.now(timezone.utc).date()
    last_trading_day = get_last_trading_day(exchange_code, today)

    # If no trading days found (e.g., holiday), assume data is fresh
    if not last_trading_day:
        return True

    # Data is outdated if latest DB date < last trading day
    return latest_db_date >= last_trading_day


@retry_on_db_lock
def fetch_and_save_stock_price_history_data(ticker: str, market_name: str, start_date: datetime, end_date: datetime, db: Session):
    try:
        # 1) Get or create the Company
        company = get_or_create_company(ticker, db)
        if not company:
            msg = f"Could not retrieve/create company with ticker {ticker}."
            return {"status": "error", "message": msg}

        # 2) Get or create the Market
        market_obj = get_or_create_market(market_name, db)

        # 3) Exchange code mapping for trading calendar
        exchange_code_map = {
            'GSPC': 'XNYS',
            'DJI': 'XNYS',
            'WSE': 'XWAR',
            'CAC': 'XPAR',
            'NDX': 'XNYS',
        }
        exchange_code = exchange_code_map.get(market_name, 'XNYS')

        # 4) Check if data is already up to date
        if data_is_up_to_date(company.company_id, market_obj.market_id, start_date, end_date, db, exchange_code):
            msg = f"All data for {ticker} in market {market_name} from {start_date.date()} to {end_date.date()} is already up to date."
            return {"status": "up_to_date", "message": msg}

        # 5) Determine trading days
        trading_days = get_trading_days(start_date, end_date, exchange_code)
        remove_date = date(2025, 1, 9)  # 🆕 Example: holiday
        if exchange_code == "XNYS" and remove_date in trading_days:
            trading_days.remove(remove_date)

        # 6) Find existing dates in DB
        existing_dates = set(
            r[0] for r in db.query(StockPriceHistory.date)
            .filter(StockPriceHistory.company_id == company.company_id)
            .filter(StockPriceHistory.market_id == market_obj.market_id)
            .filter(StockPriceHistory.date >= start_date.date())
            .filter(StockPriceHistory.date <= end_date.date())
            .all()
        )

        # 7) Compute missing dates
        missing_dates = trading_days - existing_dates
        if not missing_dates:
            msg = f"No missing dates for {ticker}, market={market_name}."
            return {"status": "up_to_date", "message": msg}

        # 🆕 Delete the latest existing row to ensure clean re-fetch if the session is still open
        latest_existing_record = (
            db.query(StockPriceHistory)
            .filter_by(company_id=company.company_id, market_id=market_obj.market_id)
            .order_by(StockPriceHistory.date.desc())
            .first()
        )

        if latest_existing_record:
            logger.info(f"Deleting potentially stale latest record on {latest_existing_record.date} for {ticker}")
            db.delete(latest_existing_record)
            db.commit()
            # Add it to missing dates
            missing_dates.add(latest_existing_record.date)

        # 8) Fetch using min/max from updated missing_dates
        fetch_start = min(missing_dates)
        fetch_end = max(missing_dates) + timedelta(days=1)
        print(f"Fetching data for {ticker} from {fetch_start} to {fetch_end}...")

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
                volume=int(row['Volume']),
                created_at=datetime.now(timezone.utc)
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
