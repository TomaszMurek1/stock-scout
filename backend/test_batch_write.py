from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from database.base import get_db
from datetime import date, timedelta


def main():
    db = next(get_db())
    tickers = ["AAPL", "MSFT", "GOOG"]
    market = "GSPC"
    end_d = date.today()
    start_d = end_d - timedelta(days=7)

    print(f"Running batch-write for {tickers} from {start_d} to {end_d}…")
    res = fetch_and_save_stock_price_history_data_batch(
        tickers=tickers,
        market_name=market,
        db=db,
        start_date=start_d,
        end_date=end_d,
        force_update=True,
    )
    print("Result:", res)


if __name__ == "__main__":
    main()
