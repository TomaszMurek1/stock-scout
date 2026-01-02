# services/yfinance_data_update/data_update_service.py

import logging
import time
from datetime import datetime, timedelta, timezone, date
from typing import List

import pandas as pd
import yfinance as yf
from database.market import Market
from database.company import Company

from sqlalchemy.orm import Session

from database.stock_data import StockPriceHistory
from services.company.company_service import get_or_create_company
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)
from services.market.market_service import get_or_create_market
from services.stock_data.stock_data_service import (
    fetch_and_save_stock_price_history_data,
)
from utils.db_retry import retry_on_db_lock

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
    tickers: list[str],
    market_name: str,
    db: Session,
    start_date,
    end_date,
    force_update: bool = False,
) -> dict:
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        # Fetch 400 days to ensure we have at least 200 trading days for SMA200
        start_date = end_date - timedelta(days=400)
    t0 = time.time()
    logger.info(
        (
            "fetch_and_save_stock_price_history_data_batch called with "
            f"{len(tickers)} tickers: {tickers}, "
            f"market: {market_name}, start: {start_date}, end: {end_date}, "
            f"force_update={force_update}"
        )
    )

    # 1) Resolve companies + market
    companies = []
    for t in tickers:
        comp = get_or_create_company(t, db)
        if not comp:
            logger.error(f"Unknown ticker: {t}")
            return {"status": "error", "message": f"Unknown ticker: {t}"}
        companies.append(comp)
    market_obj = get_or_create_market(market_name, db)
    if not market_obj:
        logger.error(f"Unknown market: {market_name}")
        return {"status": "error", "message": f"Unknown market: {market_name}"}

    t1 = time.time()
    logger.info(f"[TIMER] Company/market resolution: {t1 - t0:.3f}s")

    # 2) Delete existing if forced
    if force_update:
        comp_ids = [c.company_id for c in companies]
        logger.info(
            (
                "Force update ON: Deleting any existing price history for these "
                "companies: "
                f"{comp_ids}"
            )
        )
        deleted = db.query(StockPriceHistory).filter(
            StockPriceHistory.company_id.in_(comp_ids),
            StockPriceHistory.market_id == market_obj.market_id,
        )
        if start_date and end_date:
            deleted = deleted.filter(
                StockPriceHistory.date.between(start_date, end_date)
            )
        num_deleted = deleted.delete(synchronize_session=False)
        logger.info(
            f"Deleted {num_deleted} old StockPriceHistory rows "
            f"for force update in range."
        )
        db.flush()

    # 3) Preload all existing rows if not force update
    preload_start = time.time()
    if not force_update:
        comp_ids = [c.company_id for c in companies]
        query = (
            db.query(
                StockPriceHistory.company_id,
                StockPriceHistory.market_id,
                StockPriceHistory.date,
            )
            .filter(StockPriceHistory.company_id.in_(comp_ids))
            .filter(StockPriceHistory.market_id == market_obj.market_id)
        )
        if start_date and end_date:
            query = query.filter(StockPriceHistory.date.between(start_date, end_date))
        existing_keys = set(query.all())
    else:
        existing_keys = set()
    preload_end = time.time()
    logger.info(
        (
            f"[TIMER] Preloaded {len(existing_keys)} existing keys in "
            f"{preload_end - preload_start:.3f}s."
        )
    )

    # 4) Download all tickers' data at once (yfinance)
    t2 = time.time()
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
    t3 = time.time()
    logger.info(f"[TIMER] Batch yfinance download: {t3 - t2:.3f}s")

    # 5) Process and prepare mappings
    mappings = []
    now = datetime.now(timezone.utc)
    total_rows_attempted = 0
    prep_start = time.time()
    for comp in companies:
        logger.info(f"Processing company: {comp.ticker}")
        if comp.ticker not in raw.columns.get_level_values(0):
            continue
        df = raw[comp.ticker]
        for ts, row in df.iterrows():
            dt = ts.date()
            total_rows_attempted += 1

            # Skip if any of the critical fields are NaN
            if row[["Open", "High", "Low", "Close", "Volume"]].isnull().any():
                continue

            key = (comp.company_id, market_obj.market_id, dt)
            if not force_update and key in existing_keys:
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
    prep_end = time.time()
    logger.info(
        f"[TIMER] Processing & existence checking: {prep_end - prep_start:.3f}s"
    )

    logger.info(
        f"Attempted to build {total_rows_attempted} row(s) from yfinance data, "
        f"prepared {len(mappings)} for bulk insert.."
    )

    # 6) Bulk insert to DB
    insert_start = time.time()

    # 7) Update CompanyMarketData for all processed companies
    # This ensures that even if history was up-to-date, the "Current Price" view is refreshed.
    from database.stock_data import CompanyMarketData
    
    # Pre-fetch existing MD rows to minimize queries
    md_map = {
        md.company_id: md
        for md in db.query(CompanyMarketData).filter(
            CompanyMarketData.company_id.in_([c.company_id for c in companies])
        ).all()
    }

    for comp in companies:
        if comp.ticker not in raw.columns.get_level_values(0):
            continue
        
        # Get latest valid close price
        df = raw[comp.ticker]
        if df.empty:
            continue
            
        last_valid_idx = df["Close"].last_valid_index()
        if not last_valid_idx:
            continue
            
        latest_price = float(df.loc[last_valid_idx, "Close"])
        
        # Calculate SMAs (Rolling Averages)
        closes = df['Close']
        # We use the valid index to ensure we get the SMA corresponding to the latest price date
        sma50_series = closes.rolling(window=50).mean()
        sma200_series = closes.rolling(window=200).mean()
        
        latest_sma50 = sma50_series.loc[last_valid_idx]
        latest_sma200 = sma200_series.loc[last_valid_idx]

        md = md_map.get(comp.company_id)
        if not md:
            md = CompanyMarketData(company_id=comp.company_id)
            db.add(md)
            
        md.current_price = latest_price
        
        if not pd.isna(latest_sma50):
            md.sma_50 = float(latest_sma50)
            
        if not pd.isna(latest_sma200):
            md.sma_200 = float(latest_sma200)

        md.last_updated = datetime.now(timezone.utc)
    
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to batch update CompanyMarketData: {e}")
        # Don't fail the whole function if this optional update fails, but good to log.

    if mappings:
        db.bulk_insert_mappings(StockPriceHistory, mappings)
        db.commit()
        insert_end = time.time()
        logger.info(
            f"Batch inserted {len(mappings)} StockPriceHistory rows for {tickers}."
        )
        logger.info(f"[TIMER] Bulk insert + commit: {insert_end - insert_start:.3f}s")
        return {"status": "success", "inserted": len(mappings)}
    else:
        insert_end = time.time()
        logger.info("Batch insert: no new rows to add...")
        logger.info(f"[TIMER] No rows to insert: {insert_end - insert_start:.3f}s")
        return {"status": "success", "inserted": 0}


def ensure_fresh_data(
    ticker: str, market_name: str, use_batch_for_price_history_data: int, db: Session
):
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()

    # adjust so it uses fetch_and_save_stock_price_history_data_batch or
    # fetch_and_save_stock_price_history_data

    if not company or not market:
        raise ValueError("Company or market not found!")

    # Check for known bad/delisted ticker
    from database.stock_data import CompanyMarketData
    md = db.query(CompanyMarketData).filter(CompanyMarketData.company_id == company.company_id).first()
    if md and md.market_cap == 0:
         now_utc = datetime.now(timezone.utc)
         # naive/aware check handled safely by subtracting aware from aware (assuming last_updated is stored as UTC or converting)
         last_up = md.last_updated
         if last_up:
             if last_up.tzinfo is None:
                 last_up = last_up.replace(tzinfo=timezone.utc)
             
             if (now_utc - last_up).days < 7:
                 logger.info(f"Skipping known delisted/failed ticker {ticker} in ensure_fresh_data (market_cap=0)")
                 return

    if use_batch_for_price_history_data:
        # Use batch method
        fetch_and_save_stock_price_history_data_batch(
            tickers=[ticker],
            market_name=market_name,
            db=db,
            start_date=None,
            end_date=None,
            force_update=False,
        )
    else:
        # Use single ticker method
        fetch_and_save_stock_price_history_data(
            ticker=ticker,
            market_name=market_name,
            db=db,
            force_update=False,
        )

    update_financials_for_tickers(
        db=db,
        tickers=[ticker],
        market_name=market_name,
        include_quarterly=True,
    )
