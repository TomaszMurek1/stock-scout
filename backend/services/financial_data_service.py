import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
import yfinance as yf
from database.models import Company, Market, CompanyFinancials, CompanyMarketData
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

def is_data_fresh(last_updated, max_age_hours=24):
    if not last_updated:
        return False
    age = datetime.now(timezone.utc)  - last_updated
    return age < timedelta(hours=max_age_hours)

def fetch_and_save_financial_data(
    ticker: str,
    market_name: str,
    db: Session,
    max_age_hours: int = 24
):
    """
    Fetch financial and market data from yfinance and update DB.
    Only calls yfinance if data is older than max_age_hours.
    """
    # 1) Get Company & Market
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()
    if not company or not market:
        logger.error(f"Company or Market not found in DB: {ticker}, {market_name}")
        return {"status": "error", "message": "Company/Market not found"}

    # 2) Retrieve or create records
    financial_record = (
        db.query(CompanyFinancials)
          .filter_by(company_id=company.company_id, market_id=market.market_id)
          .first()
    )
    if not financial_record:
        financial_record = CompanyFinancials(
            company_id=company.company_id,
            market_id=market.market_id
        )
        db.add(financial_record)

    market_data_record = (
        db.query(CompanyMarketData)
          .filter_by(company_id=company.company_id, market_id=market.market_id)
          .first()
    )
    if not market_data_record:
        market_data_record = CompanyMarketData(
            company_id=company.company_id,
            market_id=market.market_id
        )
        db.add(market_data_record)

    # 3) Check if data is fresh enough to skip yfinance
    financials_fresh = is_data_fresh(financial_record.last_updated, max_age_hours)
    market_data_fresh = is_data_fresh(market_data_record.last_updated, max_age_hours)

    if financials_fresh and market_data_fresh:
        logger.info(f"{ticker} in {market_name}: Data is still fresh (<{max_age_hours}h). Skipping yfinance call.")
        return {"status": "skipped", "message": "Data is fresh; no update performed"}

    # 4) Data is not fresh => Call yfinance
    logger.info(f"{ticker} in {market_name}: Data stale. Fetching from yfinance...")
    try:
        info = yf.Ticker(ticker).info  # or .fast_info for certain fields
    except Exception as e:
        logger.error(f"Error fetching yfinance info for {ticker}: {e}")
        return {"status": "error", "message": str(e)}

    if not info:
        logger.warning(f"No financial info found for {ticker}.")
        return {"status": "no_data", "message": "No data from yfinance"}

    # 5) Update Financials
    financial_record.enterprise_value = info.get("enterpriseValue")
    financial_record.total_revenue    = info.get("totalRevenue")
    financial_record.net_income       = info.get("netIncomeToCommon")
    financial_record.ebitda           = info.get("ebitda")
    financial_record.earnings_growth  = info.get("earningsGrowth")
    financial_record.revenue_growth   = info.get("revenueGrowth")
    financial_record.gross_profit     = info.get("grossProfits")
    financial_record.gross_margins    = info.get("grossMargins")
    financial_record.operating_margins= info.get("operatingMargins")
    financial_record.profit_margins   = info.get("profitMargins")
    financial_record.return_on_assets = info.get("returnOnAssets")
    financial_record.return_on_equity = info.get("returnOnEquity")

    if info.get("lastFiscalYearEnd"):
        financial_record.last_fiscal_year_end = datetime.fromtimestamp(info["lastFiscalYearEnd"], timezone.utc)
    if info.get("mostRecentQuarter"):
        financial_record.most_recent_quarter = datetime.fromtimestamp(info["mostRecentQuarter"], timezone.utc)

    financial_record.last_updated = datetime.utcnow()

    # 6) Update Market Data
    market_data_record.current_price      = info.get("currentPrice")
    market_data_record.previous_close     = info.get("previousClose")
    market_data_record.day_high           = info.get("dayHigh")
    market_data_record.day_low            = info.get("dayLow")
    market_data_record.fifty_two_week_high= info.get("fiftyTwoWeekHigh")
    market_data_record.fifty_two_week_low = info.get("fiftyTwoWeekLow")
    market_data_record.market_cap         = info.get("marketCap")
    market_data_record.price_to_book      = info.get("priceToBook")
    market_data_record.volume             = info.get("volume")
    market_data_record.average_volume     = info.get("averageVolume")
    market_data_record.bid_price          = info.get("bid")
    market_data_record.ask_price          = info.get("ask")

    market_data_record.last_updated = datetime.now(timezone.utc) 

    # 7) Commit changes
    try:
        db.commit()
        logger.info(f"Financial and Market data updated for {ticker}, market={market_name}.")
        return {"status": "success", "message": "Data updated"}
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"Integrity error updating {ticker} data: {exc}")
        return {"status": "error", "message": str(exc)}
