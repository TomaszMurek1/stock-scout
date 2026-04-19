"""
GMMA 24-Line + Volatility Squeeze Scanner (Borawski Method)
============================================================
Memory-safe execution for 4 GB RAM / 3 000+ stocks.

Strategy:
- 24 EMA lines grouped into Red (3-21), Blue (25-60), Green (65-90)
- Edge extraction → immediate EMA column drop
- Starter% (squeeze metric) + configurable rolling smoothing
- T0/T-1 signal logic for UP and DOWN trends
"""

import gc
import logging
import time

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.scan_universe_resolver import resolve_universe
from services.company_filter_service import filter_by_market_cap
from utils.itertools_helpers import chunked

logger = logging.getLogger(__name__)

# ── EMA period definitions ──────────────────────────────────────────
RED_PERIODS = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21]        # 10 lines
BLUE_PERIODS = [25, 30, 35, 40, 45, 50, 55, 60]            # 8 lines
GREEN_PERIODS = [65, 70, 75, 80, 85, 90]                    # 6 lines

CHUNK_SIZE = 300


# ── Data loading ────────────────────────────────────────────────────

def _load_chunk(db: Session, company_ids: list[int], session_limit: int = 200) -> pd.DataFrame:
    """
    Load last session_limit trading days for a chunk of companies.
    Uses ROW_NUMBER window function for efficient server-side limiting.
    """
    sql = text("""
        SELECT sub.company_id, c.ticker, c.name,
               sub.date, sub.high, sub.low, sub.close, sub.sma_200
        FROM (
            SELECT sph.company_id, sph.date, sph.high, sph.low,
                   sph.close, sph.sma_200,
                   ROW_NUMBER() OVER (
                       PARTITION BY sph.company_id
                       ORDER BY sph.date DESC
                   ) AS rn
            FROM stock_price_history sph
            WHERE sph.company_id = ANY(:ids)
        ) sub
        JOIN companies c ON c.company_id = sub.company_id
        WHERE sub.rn <= :limit
        ORDER BY sub.company_id, sub.date ASC
    """)

    rows = db.execute(sql, {"ids": company_ids, "limit": session_limit}).fetchall()
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=[
        "company_id", "ticker", "name", "date",
        "high", "low", "close", "sma_200",
    ])

    # Immediate float32 downcast — saves 50 % RAM on numerics
    for col in ("high", "low", "close", "sma_200"):
        df[col] = df[col].astype(np.float32)

    return df


# ── GMMA computation ───────────────────────────────────────────────

def _compute_gmma_edges(group: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorised GMMA edge extraction for a single ticker group.
    Computes 24 EMA columns, extracts 5 edges, DROPS EMAs immediately.
    """
    close = group["close"]

    # ── Generate 24 EMA columns ──
    ema_cols: list[str] = []
    for span in RED_PERIODS + BLUE_PERIODS + GREEN_PERIODS:
        col_name = f"ema_{span}"
        group[col_name] = close.ewm(span=span, adjust=False).mean().astype(np.float32)
        ema_cols.append(col_name)

    # ── Extract 5 edge values ──
    red_cols = [f"ema_{s}" for s in RED_PERIODS]
    blue_cols = [f"ema_{s}" for s in BLUE_PERIODS]
    green_cols = [f"ema_{s}" for s in GREEN_PERIODS]

    group["czerw_top"] = group[red_cols].max(axis=1)
    group["czerw_bot"] = group[red_cols].min(axis=1)
    group["nieb_top"] = group[blue_cols].max(axis=1)
    group["nieb_bot"] = group[blue_cols].min(axis=1)
    group["ziel_top"] = group[green_cols].max(axis=1)

    # ── DROP all 24 EMA columns — free RAM immediately ──
    group.drop(columns=ema_cols, inplace=True)

    return group


def _compute_indicators(group: pd.DataFrame, starter_smoothing: int = 3) -> pd.DataFrame:
    """
    Compute starter_pct (squeeze), band widths, Opor_20d, Ciasny_stop_3d.
    starter_smoothing controls the rolling window for Starter%.
    """
    nieb_bot = group["nieb_bot"]
    group["starter_pct"] = (
        (np.abs(group["czerw_top"] - nieb_bot) / nieb_bot) * 100
    ).rolling(starter_smoothing).mean().astype(np.float32)

    # Internal band widths — detect whether bands are tight (true squeeze)
    # or wide (trend already developed)
    group["red_width_pct"] = (
        ((group["czerw_top"] - group["czerw_bot"]) / group["czerw_bot"].replace(0, np.nan)) * 100
    ).rolling(starter_smoothing).mean().astype(np.float32)

    group["blue_width_pct"] = (
        ((group["nieb_top"] - group["nieb_bot"]) / group["nieb_bot"].replace(0, np.nan)) * 100
    ).rolling(starter_smoothing).mean().astype(np.float32)

    group["opor_20d"] = (
        group["high"].rolling(20).max().shift(1).astype(np.float32)
    )

    group["ciasny_stop_3d"] = (
        group["low"].rolling(3).min().shift(1).astype(np.float32)
    )

    return group


# ── Trend classification ───────────────────────────────────────────

def _classify_trend(t_0: pd.Series) -> str | None:
    """
    Classify trend direction based on GMMA band ordering.
    Returns "up", "down", or None (no clear trend).
    """
    # UP: close > sma_200 AND proper band ordering (Clean Air)
    if (t_0["close"] > t_0["sma_200"]
            and t_0["czerw_bot"] > t_0["nieb_top"]
            and t_0["nieb_bot"] > t_0["ziel_top"]):
        return "up"

    # DOWN: close < sma_200 AND inverted band ordering
    if (t_0["close"] < t_0["sma_200"]
            and t_0["czerw_top"] < t_0["nieb_bot"]
            and t_0["nieb_top"] < t_0["ziel_top"]):
        return "down"

    return None


# ── Signal filtering (T0 / T-1) ────────────────────────────────────

def _filter_signals(
    df: pd.DataFrame,
    compression_threshold: float = 3.0,
    trend_filter: str = "both",
    band_width_threshold: float = 5.0,
) -> list[dict]:
    """
    Apply T0/T-1 signal logic across all tickers.
    Detects both UP and DOWN squeeze breakouts.

    band_width_threshold: max allowed internal width of Red/Blue bands at T-1.
    Rejects signals where bands are already wide (trend developed, not a true squeeze).
    """
    results: list[dict] = []

    for ticker, grp in df.groupby("ticker"):
        if len(grp) < 2:
            continue

        tail = grp.tail(2).reset_index(drop=True)
        t_minus_1 = tail.iloc[0]  # yesterday
        t_0 = tail.iloc[1]        # today

        # Skip rows with NaN in critical columns
        critical = [
            "close", "sma_200", "czerw_bot", "czerw_top",
            "nieb_top", "nieb_bot", "ziel_top", "starter_pct",
            "red_width_pct", "blue_width_pct",
        ]
        if t_0[critical].isna().any() or pd.isna(t_minus_1["starter_pct"]):
            continue

        # ── Classify trend ──
        trend = _classify_trend(t_0)
        if trend is None:
            continue

        # ── Apply trend filter ──
        if trend_filter != "both" and trend != trend_filter:
            continue

        # ── Compression (T-1) ──
        if t_minus_1["starter_pct"] > compression_threshold:
            continue

        # ── Band width check (T-1) — true squeeze requires narrow bands ──
        t1_red_w = t_minus_1["red_width_pct"] if pd.notna(t_minus_1["red_width_pct"]) else 0
        t1_blue_w = t_minus_1["blue_width_pct"] if pd.notna(t_minus_1["blue_width_pct"]) else 0
        if t1_red_w > band_width_threshold or t1_blue_w > band_width_threshold:
            continue

        # ── START signal (T0) — expansion from compression ──
        if not (t_0["starter_pct"] > t_minus_1["starter_pct"]):
            continue

        # ── Breakout confirmation ──
        if trend == "up" and not (t_0["close"] > t_0["czerw_top"]):
            continue
        if trend == "down" and not (t_0["close"] < t_0["czerw_bot"]):
            continue

        # All conditions met
        name = grp["name"].iloc[0]
        results.append({
            "ticker": str(ticker),
            "name": str(name),
            "trend": trend,
            "close": round(float(t_0["close"]), 2),
            "starter_yesterday_pct": round(float(t_minus_1["starter_pct"]), 2),
            "starter_today_pct": round(float(t_0["starter_pct"]), 2),
            "red_width_pct": round(float(t1_red_w), 2),
            "blue_width_pct": round(float(t1_blue_w), 2),
            "opor_20d": round(float(t_0["opor_20d"]), 2) if pd.notna(t_0["opor_20d"]) else None,
            "ciasny_stop_3d": round(float(t_0["ciasny_stop_3d"]), 2) if pd.notna(t_0["ciasny_stop_3d"]) else None,
            "date": str(t_0["date"]),
        })

    return results


# ── Main orchestrator ───────────────────────────────────────────────

def run_gmma_scan(
    db: Session,
    basket_ids: list[int] | None = None,
    min_market_cap: float | None = None,
    compression_threshold: float = 3.0,
    starter_smoothing: int = 3,
    session_limit: int = 200,
    trend_filter: str = "both",
    band_width_threshold: float = 5.0,
) -> dict:
    """
    Memory-safe GMMA Squeeze scanner.
    Processes companies in chunks of CHUNK_SIZE, garbage-collects after each.
    """
    start_time = time.time()

    # 1. Resolve scan universe
    if basket_ids:
        _, companies = resolve_universe(db, None, basket_ids)
    else:
        # No baskets specified → scan ALL companies
        from database.company import Company
        companies = db.query(Company).all()
        logger.info(f"GMMA scan: scanning ALL {len(companies)} companies (no basket filter)")

    if not companies:
        return {"status": "success", "data": []}

    # 2. Optional market-cap filter
    if min_market_cap:
        companies = filter_by_market_cap(db, companies, min_market_cap)
        if not companies:
            return {"status": "success", "data": []}

    company_ids = [c.company_id for c in companies]
    logger.info(f"GMMA scan: {len(company_ids)} companies in {len(list(chunked(company_ids, CHUNK_SIZE)))} chunks")

    # 3. Process in chunks
    final_results: list[dict] = []

    for i, chunk_ids in enumerate(chunked(company_ids, CHUNK_SIZE)):
        chunk_ids = list(chunk_ids)
        logger.info(f"  Chunk {i + 1}: {len(chunk_ids)} companies")

        df = _load_chunk(db, chunk_ids, session_limit)
        if df.empty:
            continue

        # Compute GMMA edges per ticker (vectorised within each group)
        df = df.groupby("ticker", group_keys=False).apply(_compute_gmma_edges)

        # Compute indicators per ticker
        df = df.groupby("ticker", group_keys=False).apply(
            _compute_indicators, starter_smoothing=starter_smoothing
        )

        # Filter signals
        chunk_signals = _filter_signals(df, compression_threshold, trend_filter, band_width_threshold)
        final_results.extend(chunk_signals)

        # ── FREE MEMORY ──
        del df
        gc.collect()

    # 4. Sort: uptrends first, then by tightest squeeze (starter_pct ascending)
    final_results.sort(key=lambda r: (r["trend"] != "up", r["starter_yesterday_pct"]))

    elapsed = time.time() - start_time
    logger.info(
        f"GMMA scan complete: {len(final_results)} signals "
        f"from {len(company_ids)} companies in {elapsed:.1f}s"
    )

    return {"status": "success", "data": final_results}


def run_gmma_scan_for_company_ids(
    db: Session,
    company_ids: list[int],
    compression_threshold: float = 5.0,
    starter_smoothing: int = 3,
    session_limit: int = 200,
    trend_filter: str = "both",
    min_market_cap: float | None = None,
    band_width_threshold: float = 5.0,
) -> list[dict]:
    """
    Run GMMA scan on specific company_ids (e.g. from user holdings/watchlist).
    Returns list of signal dicts directly (no status wrapper).
    """
    if not company_ids:
        return []

    # Optional market-cap filter
    if min_market_cap:
        from database.company import Company
        companies = db.query(Company).filter(Company.company_id.in_(company_ids)).all()
        companies = filter_by_market_cap(db, companies, min_market_cap)
        if not companies:
            return []
        company_ids = [c.company_id for c in companies]

    start_time = time.time()
    logger.info(f"GMMA scan (direct): {len(company_ids)} companies")

    final_results: list[dict] = []

    for i, chunk_ids in enumerate(chunked(company_ids, CHUNK_SIZE)):
        chunk_ids = list(chunk_ids)

        df = _load_chunk(db, chunk_ids, session_limit)
        if df.empty:
            continue

        df = df.groupby("ticker", group_keys=False).apply(_compute_gmma_edges)
        df = df.groupby("ticker", group_keys=False).apply(
            _compute_indicators, starter_smoothing=starter_smoothing
        )

        chunk_signals = _filter_signals(df, compression_threshold, trend_filter, band_width_threshold)
        final_results.extend(chunk_signals)

        del df
        gc.collect()

    # Sort: uptrends first, then by tightest squeeze
    final_results.sort(key=lambda r: (r["trend"] != "up", r["starter_yesterday_pct"]))

    elapsed = time.time() - start_time
    logger.info(f"GMMA scan (direct) complete: {len(final_results)} signals in {elapsed:.1f}s")

    return final_results


# ── Chart data for single ticker ────────────────────────────────────

def get_gmma_chart_data(db: Session, ticker: str, session_limit: int = 200) -> dict:
    """
    Return GMMA band data for a single ticker (for chart rendering).
    Returns close, sma_200, and 5 GMMA edges per session.

    Internally fetches session_limit + EMA_WARMUP extra days so that
    EMA values at the start of the visible window are fully converged.
    """
    EMA_WARMUP = 120  # longest EMA = 90; 120 gives good convergence

    fetch_limit = session_limit + EMA_WARMUP

    sql = text("""
        SELECT sub.date, sub.close, sub.sma_200
        FROM (
            SELECT sph.date, sph.close, sph.sma_200,
                   ROW_NUMBER() OVER (
                       PARTITION BY sph.company_id
                       ORDER BY sph.date DESC
                   ) AS rn
            FROM stock_price_history sph
            JOIN companies c ON c.company_id = sph.company_id
            WHERE c.ticker = :ticker
        ) sub
        WHERE sub.rn <= :limit
        ORDER BY sub.date ASC
    """)

    rows = db.execute(sql, {"ticker": ticker, "limit": fetch_limit}).fetchall()
    if not rows:
        return {"ticker": ticker, "data": []}

    df = pd.DataFrame(rows, columns=["date", "close", "sma_200"])
    for col in ("close", "sma_200"):
        df[col] = df[col].astype(np.float32)

    # Compute GMMA edges on full data (with warmup)
    ema_cols: list[str] = []
    for span in RED_PERIODS + BLUE_PERIODS + GREEN_PERIODS:
        col_name = f"ema_{span}"
        df[col_name] = df["close"].ewm(span=span, adjust=False).mean().astype(np.float32)
        ema_cols.append(col_name)

    red_cols = [f"ema_{s}" for s in RED_PERIODS]
    blue_cols = [f"ema_{s}" for s in BLUE_PERIODS]
    green_cols = [f"ema_{s}" for s in GREEN_PERIODS]

    df["czerw_top"] = df[red_cols].max(axis=1)
    df["czerw_bot"] = df[red_cols].min(axis=1)
    df["nieb_top"] = df[blue_cols].max(axis=1)
    df["nieb_bot"] = df[blue_cols].min(axis=1)
    df["ziel_top"] = df[green_cols].max(axis=1)

    df.drop(columns=ema_cols, inplace=True)

    # Trim to requested window (drop warmup rows)
    df = df.tail(session_limit).reset_index(drop=True)

    # Convert to list of dicts (rounded for JSON)
    chart_data = []
    for _, row in df.iterrows():
        chart_data.append({
            "date": str(row["date"]),
            "close": round(float(row["close"]), 2),
            "sma_200": round(float(row["sma_200"]), 2) if pd.notna(row["sma_200"]) else None,
            "czerw_top": round(float(row["czerw_top"]), 2),
            "czerw_bot": round(float(row["czerw_bot"]), 2),
            "nieb_top": round(float(row["nieb_top"]), 2),
            "nieb_bot": round(float(row["nieb_bot"]), 2),
            "ziel_top": round(float(row["ziel_top"]), 2),
        })

    return {"ticker": ticker, "data": chart_data}
