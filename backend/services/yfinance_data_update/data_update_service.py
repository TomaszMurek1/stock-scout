from sqlalchemy.orm import Session
from database.market import Market
from database.company import Company
from services.fundamentals.fetch_financial_data_controller import (
    should_fetch_financial_data,
)
from services.fundamentals.financial_data_service import fetch_and_save_financial_data
from services.stock_data.stock_data_service import (
    fetch_and_save_stock_price_history_data,
)


def ensure_fresh_data(ticker: str, market_name: str, db: Session):
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()

    if not company or not market:
        raise ValueError("Company or market not found")

    # Check financial data freshness
    if should_fetch_financial_data(company.company_id, market.market_id, db):
        fetch_and_save_financial_data(ticker, market_name, db)

    # Pass all parameters explicitly
    fetch_and_save_stock_price_history_data(
        ticker=ticker,
        market_name=market_name,
        db=db,
        force_update=False,  # Or set based on your needs
    )
