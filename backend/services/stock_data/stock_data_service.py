from typing import List, Set
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
from utils.db_retry import retry_on_db_lock
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_missing_trading_days(
    db: Session, company, market, calendar, exchange_code: str, today: date
) -> tuple[List[date], date]:
    """
    Determine all missing trading days between the last available date
    in the database and the last trading day up to today.
    Returns both the list of missing trading days and the last DB date.
    """
    last_db_date = (
        db.query(func.max(StockPriceHistory.date))
        .filter(StockPriceHistory.company_id == company.company_id)
        .filter(StockPriceHistory.market_id == market.market_id)
        .scalar()
    )

    if last_db_date is None:
        start_date = today - timedelta(days=3 * 365)
    else:
        start_date = last_db_date + timedelta(days=1)

    last_trading_day = get_last_trading_day(exchange_code, today)
    if not last_trading_day:
        last_trading_day = today  # fallback

    if start_date > last_trading_day:
        return [], last_db_date

    schedule = calendar.schedule(start_date=start_date, end_date=last_trading_day)
    return list(schedule.index.date), last_db_date


def get_trading_days(
    start_date: datetime, end_date: datetime, exchange_code: str
) -> set:
    calendar = mcal.get_calendar(exchange_code)
    schedule = calendar.schedule(start_date=start_date.date(), end_date=end_date.date())
    return set(schedule.index.date)


def get_last_trading_day(exchange_code: str, up_to_date: date) -> date:
    calendar = mcal.get_calendar(exchange_code)
    start_date = up_to_date - timedelta(days=7)
    schedule = calendar.schedule(start_date=start_date, end_date=up_to_date)
    if schedule.empty:
        return None
    return schedule.index[-1].date()


@retry_on_db_lock
def fetch_and_save_stock_price_history_data(
    ticker: str, market_name: str, db: Session, force_update: bool = False
) -> dict:
    try:
        company = get_or_create_company(ticker, db)
        market_obj = get_or_create_market(market_name, db)
        if not company or not market_obj:
            logger.error("Company or market not found")
            return {"status": "error", "message": "Company or market not found"}

        exchange_code_map = {
            "GSPC": "XNYS",
            "XWAR": "XWAR",
            "NDX": "XNAS",
        }
        exchange_code = exchange_code_map.get(market_name, "XNYS")
        calendar = mcal.get_calendar(exchange_code)
        today = datetime.now(timezone.utc).date()

        # Get missing dates and last DB date
        missing_dates, last_db_date = get_missing_trading_days(
            db, company, market_obj, calendar, exchange_code, today
        )

        # ⛔️ Early exit if today's record is already present
        if last_db_date and last_db_date >= today:
            return {
                "status": "up_to_date",
                "message": (
                    f"Latest record is already up to date "
                    f"({last_db_date.isoformat()})"
                ),
            }

        # Re-fetch and replace the last DB record if not today
        recheck_dates = missing_dates.copy()
        forced_overwrite_dates = set()
        if last_db_date:
            recheck_dates.insert(0, last_db_date)
            forced_overwrite_dates.add(last_db_date)

        if not recheck_dates:
            return {"status": "up_to_date", "message": "No relevant dates to check"}

        start_fetch_date = min(recheck_dates) - timedelta(days=1)
        end_fetch_date = max(recheck_dates) + timedelta(days=1)

        stock_data = yf.Ticker(ticker).history(
            start=start_fetch_date,
            end=end_fetch_date,
            interval="1d",
            prepost=False,
            actions=False,
        )

        if stock_data is None or stock_data.empty:
            return {"status": "no_data", "message": "No data from yfinance"}

        fetched_dates = stock_data.index.date.tolist()
        dates_to_update = (
            recheck_dates
            if force_update
            else [d for d in recheck_dates if d in fetched_dates]
        )

        if dates_to_update:
            process_updates(
                db=db,
                company=company,
                market=market_obj,
                stock_data=stock_data,
                dates_to_update=dates_to_update,
                force_update=force_update,
                forced_overwrite_dates=forced_overwrite_dates,
            )

        # Update CompanyMarketData with the latest available price from the fetched data
        # This ensures that the current price view is consistent with stock history
        if not stock_data.empty:
            from database.stock_data import CompanyMarketData
            latest_row = stock_data.iloc[-1]
            latest_price = float(latest_row["Close"])
            
            md = db.query(CompanyMarketData).filter_by(company_id=company.company_id).first()
            if not md:
                md = CompanyMarketData(company_id=company.company_id)
                db.add(md)
            
            md.current_price = latest_price
            # md.market_cap can be updated if shares_outstanding is known, but we leave that to financials sync
            md.last_updated = datetime.now(timezone.utc)
            db.commit()

        return {
            "status": "success",
            "message": f"Updated {len(dates_to_update)} records",
            "dates": [d.isoformat() for d in dates_to_update],
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Update failed: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}


def process_updates(
    db: Session,
    company,
    market,
    stock_data,
    dates_to_update: List[date],
    force_update: bool,
    forced_overwrite_dates: Set[date],
):
    """Insert or update records in StockPriceHistory."""
    rows: list[dict] = []
    for date_str, row in stock_data.iterrows():
        date_obj = date_str.date()
        if date_obj not in dates_to_update:
            continue

        # Always overwrite for forced dates like last_db_date
        if force_update or date_obj in forced_overwrite_dates:
            db.query(StockPriceHistory).filter_by(
                company_id=company.company_id,
                market_id=market.market_id,
                date=date_obj,
            ).delete()
        else:
            # Skip if the record already exists
            exists = (
                db.query(StockPriceHistory)
                .filter_by(
                    company_id=company.company_id,
                    market_id=market.market_id,
                    date=date_obj,
                )
                .first()
            )
            if exists:
                continue

        rows.append(
            {
                "company_id": company.company_id,
                "market_id": market.market_id,
                "date": date_obj,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "adjusted_close": round(float(row.get("Adj Close", row["Close"])), 2),
                "volume": int(row["Volume"]),
                "created_at": datetime.now(timezone.utc),
            }
        )

    if not rows:
        logger.info("Processed_ 0 records")
        return

    stmt = (
        insert(StockPriceHistory)
        .values(rows)
        .on_conflict_do_nothing(
            index_elements=[StockPriceHistory.company_id, StockPriceHistory.market_id, StockPriceHistory.date]
        )
    )
    try:
        db.execute(stmt)
        db.commit()
        logger.info(f"Processed_ {len(rows)} records")
    except IntegrityError as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("Duplicate price rows skipped for %s: %s", company.ticker, exc)
