import logging
from datetime import datetime
from sqlalchemy.orm import Session
import yfinance as yf
from database.models import Company, Market, CompanyFinancials, CompanyMarketData
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

def get_or_create_record(model, company_id: int, market_id: int, db: Session):
    """
    Helper to fetch an existing record or create a new one.
    """
    record = (
        db.query(model)
        .filter_by(company_id=company_id, market_id=market_id)
        .first()
    )
    if not record:
        record = model(company_id=company_id, market_id=market_id)
        db.add(record)
    return record

def fetch_and_save_financial_data(ticker: str, market_name: str, db: Session):
    """
    Fetch financial and market data from yfinance and update DB.
    """
    yticker = yf.Ticker(ticker)

    try:
        info = yticker.info
    except Exception as e:
        logger.error(f"Error fetching yfinance info for {ticker}: {e}")
        return {"status": "error", "message": str(e)}

    if not info:
        logger.warning(f"No financial info found for {ticker}.")
        return {"status": "no_data", "message": "No data from yfinance"}

    # Find Company & Market
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()

    if not company or not market:
        logger.error(f"Company or Market not found in DB: {ticker}, {market_name}")
        return {"status": "error", "message": "Company/Market not found"}

    # Retrieve or create records
    financial_record = db.query(CompanyFinancials).filter_by(company_id=company.company_id, market_id=market.market_id).first()
    if not financial_record:
        financial_record = CompanyFinancials(company_id=company.company_id, market_id=market.market_id)
        db.add(financial_record)

    market_data_record = db.query(CompanyMarketData).filter_by(company_id=company.company_id, market_id=market.market_id).first()
    if not market_data_record:
        market_data_record = CompanyMarketData(company_id=company.company_id, market_id=market.market_id)
        db.add(market_data_record)

    # Assign fetched data
    financial_record.enterprise_value = info.get("enterpriseValue")
    financial_record.total_revenue = info.get("totalRevenue")
    financial_record.net_income = info.get("netIncomeToCommon")
    financial_record.ebitda = info.get("ebitda")
    financial_record.earnings_growth = info.get("earningsGrowth")
    financial_record.revenue_growth = info.get("revenueGrowth")
    financial_record.gross_profit = info.get("grossProfits")
    financial_record.gross_margins = info.get("grossMargins")
    financial_record.operating_margins = info.get("operatingMargins")
    financial_record.profit_margins = info.get("profitMargins")
    financial_record.return_on_assets = info.get("returnOnAssets")
    financial_record.return_on_equity = info.get("returnOnEquity")
    financial_record.last_fiscal_year_end = datetime.utcfromtimestamp(info.get("lastFiscalYearEnd", 0)) if info.get("lastFiscalYearEnd") else None
    financial_record.most_recent_quarter = datetime.utcfromtimestamp(info.get("mostRecentQuarter", 0)) if info.get("mostRecentQuarter") else None

    # Market Data
    market_data_record.current_price = info.get("currentPrice")
    market_data_record.previous_close = info.get("previousClose")
    market_data_record.day_high = info.get("dayHigh")
    market_data_record.day_low = info.get("dayLow")
    market_data_record.fifty_two_week_high = info.get("fiftyTwoWeekHigh")
    market_data_record.fifty_two_week_low = info.get("fiftyTwoWeekLow")
    market_data_record.market_cap = info.get("marketCap")
    market_data_record.price_to_book = info.get("priceToBook")
    market_data_record.volume = info.get("volume")
    market_data_record.average_volume = info.get("averageVolume")
    market_data_record.bid_price = info.get("bid")
    market_data_record.ask_price = info.get("ask")

    financial_record.last_updated = datetime.utcnow()
    market_data_record.last_updated = datetime.utcnow()

    # Commit Changes
    try:
        db.commit()
        logger.info(f"Financial and Market data updated for {ticker}, market={market_name}.")
        return {"status": "success", "message": "Data updated"}
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"Integrity error updating {ticker} data: {exc}")
        return {"status": "error", "message": str(exc)}
