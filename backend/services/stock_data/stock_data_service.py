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
def fetch_and_save_stock_price_history_data(
    ticker: str,
    market_name: str,
    db: Session,


) -> dict:
    """
    Stock history fetcher with:
    - Regular trading hours only (prepost=False)
    - 3-year fallback
    - Delete-replace strategy for updates
    - Database lock retry logic
    """
    try:
        # 1. Get or create company and market
        company = get_or_create_company(ticker, db)
        if not company:
            return {"status": "error", "message": f"Company {ticker} not found"}

        market_obj = get_or_create_market(market_name, db)
        if not market_obj:
            return {"status": "error", "message": f"Market {market_name} not found"}

        # 2. Determine exchange code
        exchange_code_map = {
            'GSPC': 'XNYS', 'DJI': 'XNYS', 'WSE': 'XWAR',
            'CAC': 'XPAR', 'NDX': 'XNYS'
        }
        exchange_code = exchange_code_map.get(market_name, 'XNYS')

        # 3. Find latest existing record
        latest_record = db.query(func.max(StockPriceHistory.date))\
            .filter_by(company_id=company.company_id, market_id=market_obj.market_id)\
            .scalar()

        # 4. Determine date range
        end_date = datetime.now(timezone.utc)
        start_date = None

        if latest_record:
            # Start from day after latest record
            start_date = latest_record + timedelta(days=1)
            if start_date > end_date.date():
                start_date = end_date.date() - timedelta(days=1)
        else:
            # No records - fallback to 3 years
            start_date = end_date.date() - timedelta(days=3*365)

        # 5. Get trading calendar
        calendar = mcal.get_calendar(exchange_code)
        trading_schedule = calendar.schedule(
            start_date=start_date,
            end_date=end_date.date()
        )
        
        if trading_schedule.empty:
            return {"status": "no_trading_days", "message": "No trading days in range"}

        trading_days = trading_schedule.index.date.tolist()

        # 6. Check existing dates in DB
        existing_dates = set(
            r[0] for r in db.query(StockPriceHistory.date)
            .filter_by(company_id=company.company_id, market_id=market_obj.market_id)
            .filter(StockPriceHistory.date >= start_date)
            .all()
        )

        # 7. Find missing dates
        missing_dates = [d for d in trading_days if d not in existing_dates]

        # 8. Always refresh today's data
        today = datetime.now(timezone.utc).date()
        if today in existing_dates:
            logger.info(f"Re-fetching today's data for {ticker}")
            db.query(StockPriceHistory)\
                .filter_by(
                    company_id=company.company_id,
                    market_id=market_obj.market_id,
                    date=today
                )\
                .delete()
            if today not in missing_dates:
                missing_dates.append(today)

        if not missing_dates:
            return {"status": "up_to_date", "message": "All data already exists"}

        # 9. Fetch from yfinance (regular hours only)
        fetch_start = min(missing_dates) - timedelta(days=1)  # Buffer for timezones
        fetch_end = max(missing_dates) + timedelta(days=1)
        
        stock = yf.Ticker(ticker)
        stock_data = stock.history(
            start=fetch_start,
            end=fetch_end,
            interval="1d",
            prepost=False  # Only regular trading hours data
        )

        if stock_data.empty:
            return {"status": "no_data", "message": "No data from yfinance"}

        # 10. Process and insert data
        new_records = 0
        for date_str, row in stock_data.iterrows():
            date_obj = date_str.date()
            if date_obj not in missing_dates:
                continue

            # Delete any existing record first
            db.query(StockPriceHistory)\
                .filter_by(
                    company_id=company.company_id,
                    market_id=market_obj.market_id,
                    date=date_obj
                )\
                .delete()

            # Insert new record
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

        db.commit()
        return {
            "status": "success",
            "message": f"Added/updated {new_records} records",
            "start_date": fetch_start.isoformat(),
            "end_date": fetch_end.isoformat()
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to fetch stock data: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}
