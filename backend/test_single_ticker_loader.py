from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data,
)
from services.company.company_service import get_or_create_company
from services.market.market_service import get_or_create_market
from database.base import get_db
from sqlalchemy.orm import Session
from database.stock_data import StockPriceHistory


def main():
    # Grab a DB session
    db: Session = next(get_db())

    ticker = "AAPL"
    market_name = "GSPC"
    print(f"Ensuring fresh data for {ticker} in {market_name}…")

    # 1) Run the loader
    result = fetch_and_save_stock_price_history_data(
        ticker=ticker,
        market_name=market_name,
        db=db,
        force_update=True,
    )
    print("Data‐update result:", result)

    # 2) Look up the company & market so we can filter correctly
    company = get_or_create_company(ticker, db)
    market = get_or_create_market(market_name, db)

    # 3) Verify at least one row exists
    latest = (
        db.query(StockPriceHistory)
        .filter_by(company_id=company.company_id, market_id=market.market_id)
        .order_by(StockPriceHistory.date.desc())
        .first()
    )
    if latest:
        print(f"✔ Found history row on {latest.date} (close={latest.close})")
    else:
        print("✖ No history rows found – something’s still off.")


if __name__ == "__main__":
    main()
