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
    ticker = ticker.upper().strip()
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if company:
        return company

    # If not found, try to fetch info from Yahoo
    logger.info(f"Company {ticker} not found in DB; fetching from yfinance.")
    try:
        stock = yf.Ticker(ticker)
        stock_info = stock.info or {}
    except Exception as e:
        logger.error(f"Error fetching yfinance info for {ticker}: {e}")
        stock_info = {}

    company = Company(
        name=stock_info.get('longName') or stock_info.get('shortName') or ticker,
        ticker=ticker,
        sector=stock_info.get('sector'),
        industry=stock_info.get('industry')
    )
    db.add(company)
    try:
        db.commit()
        db.refresh(company)
    except IntegrityError:
        db.rollback()
        logger.info(f"Race condition encountered for {ticker}, retrieving existing record.")
        company = db.query(Company).filter(Company.ticker == ticker).first()
        
    return company

