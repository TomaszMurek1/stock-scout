import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy.exc import  IntegrityError
from database.company import Company
import logging
from sqlalchemy.exc import IntegrityError
from utils.db_retry import retry_on_db_lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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

