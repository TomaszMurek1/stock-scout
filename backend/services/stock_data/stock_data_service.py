from typing import List
from sqlalchemy import func
import yfinance as yf
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database.stock_data import StockPriceHistory
import logging
import pandas_market_calendars as mcal
from datetime import date
from services.company.company_service import get_or_create_company
from services.market.market_service import get_or_create_market
from services.utils.db_retry import retry_on_db_lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_missing_trading_days(
    db: Session, company, market, calendar, exchange_code: str, today: date
) -> List[date]:
    """
    Determine all missing trading days between the last available date
    in the database and the last trading day up to today.
    If no data exists in the database, fetch from three years ago.
    """
    # Get the latest date from which data is present
    last_db_date = (
        db.query(func.max(StockPriceHistory.date))
        .filter(StockPriceHistory.company_id == company.company_id)
        .filter(StockPriceHistory.market_id == market.market_id)
        .scalar()
    )

    if last_db_date is None:
        # No data in DB: set the start date to three years ago
        start_date = today - timedelta(days=3 * 365)
    else:
        # Start with the day after the latest record in the DB
        start_date = last_db_date + timedelta(days=1)

    # Get the last trading day up to today
    last_trading_day = get_last_trading_day(exchange_code, today)
    if not last_trading_day:
        last_trading_day = today  # fallback if calendar does not return a valid day

    # If start_date is after last_trading_day, there are no missing days
    if start_date > last_trading_day:
        return []

    # Get the schedule for the range [start_date, last_trading_day]
    schedule = calendar.schedule(start_date=start_date, end_date=last_trading_day)
    return list(schedule.index.date)


def get_trading_days(
    start_date: datetime, end_date: datetime, exchange_code: str
) -> set:
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
    exchange_code: str,
) -> bool:
    # 1. Check if all trading days in the original range are present
    existing_dates = set(
        r[0]
        for r in db.query(StockPriceHistory.date)
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
    latest_db_date = (
        db.query(func.max(StockPriceHistory.date))
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.market_id == market_id)
        .scalar()
    )

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
    ticker: str, market_name: str, db: Session, force_update: bool = False
) -> dict:
    try:
        # 1. Validate company and market
        company = get_or_create_company(ticker, db)
        market_obj = get_or_create_market(market_name, db)
        if not company or not market_obj:
            logger.error("Company or market not found")
            return {"status": "error", "message": "Company or market not found"}

        # 2. Set up exchange calendar and determine exchange code
        exchange_code_map = {
            "GSPC": "XNYS",
            "DJI": "XNYS",
            "WSE": "XWAR",
            "CAC": "XPAR",
            "NDX": "XNYS",
        }
        exchange_code = exchange_code_map.get(market_name, "XNYS")
        calendar = mcal.get_calendar(exchange_code)
        today = datetime.now(timezone.utc).date()

        # 3. Determine missing trading days from the last record to the last trading day
        missing_dates = get_missing_trading_days(
            db, company, market_obj, calendar, exchange_code, today
        )
        if not missing_dates:
            return {"status": "up_to_date", "message": "No relevant dates to check"}

        # 4. Fetch data from yfinance over a window covering the missing dates
        start_fetch_date = min(missing_dates) - timedelta(days=1)
        end_fetch_date = max(missing_dates) + timedelta(days=1)
        stock_data = yf.Ticker(ticker).history(
            start=start_fetch_date,
            end=end_fetch_date,
            interval="1d",
            prepost=False,
            actions=False,
        )
        if stock_data is None or stock_data.empty:
            return {"status": "no_data", "message": "No data from yfinance"}

        # 5. Identify the dates to update (filter for dates present in the fetched data)
        fetched_dates = stock_data.index.date.tolist()
        dates_to_update = (
            missing_dates
            if force_update
            else [d for d in missing_dates if d in fetched_dates]
        )

        # 6. Process updates
        if dates_to_update:
            process_updates(
                db=db,
                company=company,
                market=market_obj,
                stock_data=stock_data,
                dates_to_update=dates_to_update,
                force_update=force_update,
            )

        return {
            "status": "success",
            "message": f"Updated {len(dates_to_update)} records",
            "dates": [d.isoformat() for d in dates_to_update],
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Update failed: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}


def get_relevant_dates(calendar, today: date) -> List[date]:
    """Get today and previous trading day"""
    try:
        today_schedule = calendar.schedule(start_date=today, end_date=today)
        prev_schedule = calendar.schedule(
            start_date=today - timedelta(days=7), end_date=today - timedelta(days=1)
        )

        dates = []
        if not today_schedule.empty:
            dates.append(today)
        if not prev_schedule.empty:
            dates.append(prev_schedule.index[-1].date())
        return dates

    except Exception as e:
        logger.error(f"Calendar error: {str(e)}")
        return []


def fetch_yfinance_data(ticker: str, dates: List[date]):
    """Fetch data for specified dates"""
    if not dates:
        return None
    start_date = min(dates) - timedelta(days=1)
    end_date = max(dates) + timedelta(days=1)

    try:
        return yf.Ticker(ticker).history(
            start=start_date, end=end_date, interval="1d", prepost=False, actions=False
        )
    except Exception as e:
        logger.error(f"YFinance error: {str(e)}")
        return None


def get_dates_needing_update(
    db, company, market, fetched_dates: List[date], force_update: bool
) -> List[date]:
    """Identify dates requiring updates"""
    if not fetched_dates:
        return []

    existing_dates = set(
        r[0]
        for r in db.query(StockPriceHistory.date)
        .filter_by(company_id=company.company_id, market_id=market.market_id)
        .filter(StockPriceHistory.date.in_(fetched_dates))
        .all()
    )

    return (
        fetched_dates
        if force_update
        else [d for d in fetched_dates if d not in existing_dates]
    )


def process_updates(
    db, company, market, stock_data, dates_to_update: List[date], force_update: bool
):
    """Execute database operations"""
    new_records = 0
    for date_str, row in stock_data.iterrows():
        date_obj = date_str.date()
        if date_obj not in dates_to_update:
            continue

        if force_update:
            db.query(StockPriceHistory).filter_by(
                company_id=company.company_id, market_id=market.market_id, date=date_obj
            ).delete()

        db.add(
            StockPriceHistory(
                company_id=company.company_id,
                market_id=market.market_id,
                date=date_obj,
                open=round(float(row["Open"]), 3),
                high=round(float(row["High"]), 3),
                low=round(float(row["Low"]), 3),
                close=round(float(row["Close"]), 3),
                adjusted_close=round(float(row.get("Adj Close", row["Close"])), 3),
                volume=int(row["Volume"]),
                created_at=datetime.now(timezone.utc),
            )
        )
        new_records += 1

    db.commit()
    logger.info(f"Processed {new_records} records")
