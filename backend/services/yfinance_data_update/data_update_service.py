# services/yfinance_data_update/data_update_service.py

import logging
from datetime import datetime, timezone, date
from typing import List

import pandas as pd
import yfinance as yf
from database.market import Market
from database.company import Company

from sqlalchemy.orm import Session

from database.stock_data import StockPriceHistory
from services.company.company_service import get_or_create_company
from services.fundamentals.financials_batch_update_service import (
    fetch_and_save_financial_data_for_list_of_tickers,
)
from services.market.market_service import get_or_create_market
from services.stock_data.stock_data_service import (
    fetch_and_save_stock_price_history_data,
)
from services.utils.db_retry import retry_on_db_lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _fetch_price_df(
    tickers: List[str],
    start_date: date,
    end_date: date,
    interval: str = "1d",
    prepost: bool = False,
    actions: bool = False,
) -> pd.DataFrame:
    """
    Batch-fetch OHLCV data for given tickers between start_date and end_date..
    Returns:
      - single-level DataFrame if len(tickers) == 1
      - MultiIndex DataFrame (ticker, field) if len(tickers) > 1
    """
    df = yf.download(
        tickers,
        start=start_date,
        end=end_date,
        interval=interval,
        prepost=prepost,
        actions=actions,
        group_by="ticker",
        auto_adjust=False,
        progress=False,
    )
    return df


@retry_on_db_lock
def fetch_and_save_stock_price_history_data_batch(
    tickers: List[str],
    market_name: str,
    db: Session,
    start_date: date,
    end_date: date,
    force_update: bool = False,
) -> dict:
    """
    Batch‐download all tickers’ history at once, skip rows with missing data,
    and bulk‐insert. If force_update, delete existing rows in the date range first.
    """
    # 1) Resolve companies + market
    companies = []
    for t in tickers:
        comp = get_or_create_company(t, db)
        if not comp:
            return {"status": "error", "message": f"Unknown ticker: {t}"}
        companies.append(comp)

    market_obj = get_or_create_market(market_name, db)
    if not market_obj:
        return {"status": "error", "message": f"Unknown market: {market_name}"}

    # 2) Delete existing if forced
    if force_update:
        comp_ids = [c.company_id for c in companies]
        db.query(StockPriceHistory).filter(
            StockPriceHistory.company_id.in_(comp_ids),
            StockPriceHistory.market_id == market_obj.market_id,
            StockPriceHistory.date.between(start_date, end_date),
        ).delete(synchronize_session=False)
        db.flush()

    # 3) Download everything at once
    raw = _fetch_price_df(
        tickers,
        start_date=start_date,
        end_date=end_date,
        interval="1d",
        prepost=False,
        actions=False,
    )
    if not isinstance(raw.columns, pd.MultiIndex):
        raw = pd.concat({tickers[0]: raw}, axis=1)

    # 4) Build bulk‐insert mappings, skipping any NaN rows
    mappings = []
    now = datetime.now(timezone.utc)
    for comp in companies:
        df = raw[comp.ticker]
        for ts, row in df.iterrows():
            # Skip if any of the critical fields are NaN
            if row[["Open", "High", "Low", "Close", "Volume"]].isnull().any():
                continue

            dt = ts.date()
            # On non‐forced runs, skip dates that already exist
            if not force_update:
                exists = (
                    db.query(StockPriceHistory)
                    .filter_by(
                        company_id=comp.company_id,
                        market_id=market_obj.market_id,
                        date=dt,
                    )
                    .first()
                )
                if exists:
                    continue

            mappings.append(
                {
                    "company_id": comp.company_id,
                    "market_id": market_obj.market_id,
                    "date": dt,
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "adjusted_close": round(
                        float(row.get("Adj Close", row["Close"])), 2
                    ),
                    "volume": int(row["Volume"]),
                    "created_at": now,
                }
            )

    # 5) Bulk insert & commit
    if mappings:
        db.bulk_insert_mappings(StockPriceHistory, mappings)
        db.commit()
        logger.info(f"Batch inserted {len(mappings)} rows")
        return {"status": "success", "inserted": len(mappings)}
    else:
        logger.info("Batch insert: no new rows to add")
        return {"status": "success", "inserted": 0}


def ensure_fresh_data(ticker: str, market_name: str, db: Session):
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()

    if not company or not market:
        raise ValueError("Company or market not found")

    # Pass all parameters explicitly
    fetch_and_save_financial_data_for_list_of_tickers(
        tickers=[ticker],
        market_name=market_name,
        db=db,
    )

    fetch_and_save_stock_price_history_data(
        ticker=ticker,
        market_name=market_name,
        db=db,
        force_update=False,  # Or set based on your needss
    )
