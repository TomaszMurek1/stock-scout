#!/usr/bin/env python3
# test_batch_fetch.py

import pandas as pd
from services.yfinance_data_update.data_update_service import _fetch_price_df
from datetime import date, timedelta


def main():
    tickers = ["AAPL", "MSFT", "GOOG"]
    end_date = date.today()
    start_date = end_date - timedelta(days=14)

    print(f"Fetching data for {tickers} from {start_date} to {end_date}…")
    df = _fetch_price_df(tickers, start_date=start_date, end_date=end_date)

    # Sanity checks
    if df.empty:
        print("✖ No data returned — something’s broken in _fetch_price_df.")
        return

    # Print out which tickers came back and the first few rows
    if isinstance(df.columns, pd.MultiIndex):
        print(
            "✔ Multi-ticker MultiIndex detected. Tickers:", list(df.columns.levels[0])
        )
    else:
        print("⚠️  Expected a MultiIndex but got a single-level DataFrame.")

    print("\nSample rows:")
    print(df.head())


if __name__ == "__main__":
    main()
