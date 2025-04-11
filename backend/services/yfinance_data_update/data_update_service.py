# data_update_service.py
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.market import Market
from database.company import Company
from services.fundamentals.fetch_financial_data_controller import should_fetch_financial_data
from services.fundamentals.financial_data_service import fetch_and_save_financial_data
from services.stock_data.stock_data_service import fetch_and_save_stock_price_history_data
from database.stock_data import StockPriceHistory


def ensure_fresh_data(ticker: str, market_name: str, db: Session):
    """
    Smart update that fetches from last existing record date (or default range)
    """
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()
    if not company or not market:
        raise ValueError("Company or market not found")

    # 1. Update Financial Data (24h check remains the same)
    if should_fetch_financial_data(company.company_id, market.market_id, db):
        fetch_and_save_financial_data(ticker, market_name, db)

    # 2. Determine stock history fetch window
    latest_date = db.query(func.max(StockPriceHistory.date))\
        .filter_by(company_id=company.company_id, market_id=market.market_id)\
        .scalar()

    # Define fetch window dynamically
    end_date = datetime.now(timezone.utc)
    start_date = latest_date + timedelta(days=1) if latest_date else end_date - timedelta(days=3*365)

    # 3. Fetch with dynamic window
    fetch_and_save_stock_price_history_data(
        ticker=ticker,
        market_name=market_name,
        db=db,
    )