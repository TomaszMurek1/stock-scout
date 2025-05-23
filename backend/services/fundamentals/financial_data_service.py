from sqlalchemy.orm import Session
from database.market import Market
from database.company import Company
from services.fundamentals.fetch_financial_data_controller import (
    should_fetch_financial_data,
)
from services.fundamentals.fetch_financial_data_executor import (
    fetch_and_save_financial_data_core,
)


def fetch_and_save_financial_data(
    ticker: str, market_name: str, db: Session, max_age_hours: int = 24
):
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()

    if not company or not market:
        return {"status": "error", "message": "Company or market not found"}
    print(f"11111111111111111111111111111111111111111111111111111111")
    if should_fetch_financial_data(
        company.company_id, market.market_id, db, max_age_hours
    ):
        print(f"--------------------------------------------------------")
        return fetch_and_save_financial_data_core(ticker, market_name, db)

    return {"status": "skipped", "message": "Data is fresh"}
