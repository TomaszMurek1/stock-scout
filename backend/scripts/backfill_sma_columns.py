"""
Backfill SMA-20, SMA-50, SMA-100, and SMA-200 values for all existing rows
in stock_price_history.

For each company+market combination:
1. Load all close prices ordered by date
2. Compute rolling means for windows 20, 50, 100, 200
3. Batch-update sma_20, sma_50, sma_100, sma_200 columns

Usage (inside Docker):
    docker compose -f docker-compose.dev.yml exec backend python scripts/backfill_sma_columns.py

Production:
    docker compose -f docker-compose.prod.yml exec backend python scripts/backfill_sma_columns.py
"""
import sys
import os
import time
import logging

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from sqlalchemy import text
from database.base import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SMA_WINDOWS = [20, 50, 100, 200]


def backfill_sma():
    db = SessionLocal()
    try:
        # Get all distinct company_id + market_id pairs
        pairs = db.execute(text("""
            SELECT DISTINCT company_id, market_id
            FROM stock_price_history
            ORDER BY market_id, company_id
        """)).fetchall()

        total = len(pairs)
        logger.info(f"Found {total} company-market pairs to process")
        logger.info(f"SMA windows: {SMA_WINDOWS}")
        start = time.time()

        for idx, (company_id, market_id) in enumerate(pairs, 1):
            try:
                _backfill_company(db, company_id, market_id)
            except Exception as e:
                logger.error(f"Error processing company_id={company_id}, market_id={market_id}: {e}")
                db.rollback()
                continue

            if idx % 50 == 0 or idx == total:
                elapsed = time.time() - start
                rate = idx / elapsed if elapsed > 0 else 0
                eta = (total - idx) / rate if rate > 0 else 0
                logger.info(
                    f"Progress: {idx}/{total} ({idx*100//total}%) | "
                    f"Elapsed: {elapsed:.0f}s | ETA: {eta:.0f}s"
                )

        elapsed = time.time() - start
        logger.info(f"Backfill complete. Processed {total} pairs in {elapsed:.1f}s")

    finally:
        db.close()


def _backfill_company(db, company_id: int, market_id: int):
    """Compute and store SMA values for a single company."""
    # Fetch all close prices ordered by date
    rows = db.execute(text("""
        SELECT data_id, date, adjusted_close
        FROM stock_price_history
        WHERE company_id = :cid AND market_id = :mid
        ORDER BY date ASC
    """), {"cid": company_id, "mid": market_id}).fetchall()

    min_window = min(SMA_WINDOWS)
    if len(rows) < min_window:
        return  # Not enough data for even the smallest SMA

    df = pd.DataFrame(rows, columns=["data_id", "date", "adjusted_close"])

    # Compute all SMA windows
    sma_cols = {}
    for w in SMA_WINDOWS:
        col = f"sma_{w}"
        if len(df) >= w:
            df[col] = df["adjusted_close"].rolling(window=w, min_periods=w).mean()
        else:
            df[col] = pd.NA
        sma_cols[w] = col

    # Batch update using individual UPDATE statements
    # Process in chunks of 500 for periodic commits
    update_count = 0
    for i, row in df.iterrows():
        # Skip rows where even the smallest SMA is NaN
        sma_min_col = sma_cols[min_window]
        if pd.isna(row[sma_min_col]):
            continue

        # Build SET clause dynamically for non-null SMA values
        params = {"did": int(row["data_id"])}
        set_parts = []
        for w in SMA_WINDOWS:
            col = sma_cols[w]
            val = row[col]
            if pd.notna(val):
                params[col] = float(val)
                set_parts.append(f"{col} = :{col}")

        if not set_parts:
            continue

        set_clause = ", ".join(set_parts)
        db.execute(
            text(f"UPDATE stock_price_history SET {set_clause} WHERE data_id = :did"),
            params,
        )
        update_count += 1

        # Commit every 500 rows to avoid long transactions
        if update_count % 500 == 0:
            db.commit()

    db.commit()


if __name__ == "__main__":
    backfill_sma()
