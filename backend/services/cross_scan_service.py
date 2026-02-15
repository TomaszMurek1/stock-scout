"""Shared logic for Golden-Cross and Death-Cross scans.

Both scans follow the exact same pipeline — only the `analysis_type` string
and a few cache-hit predicates differ.  This module extracts that pipeline
so each route file becomes a thin wrapper.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Callable, List, Sequence, Tuple

from sqlalchemy.orm import Session

from database.analysis import AnalysisResult
from database.company import Company
from database.market import Market
from services.analysis_results.analysis_results import get_or_update_analysis_result
from services.company_filter_service import filter_by_market_cap
from services.scan_universe_resolver import resolve_universe
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from utils.itertools_helpers import chunked

logger = logging.getLogger(__name__)

# ── Result formatting ──────────────────────────────────────────────

def _format_result(
    ticker: str,
    name: str,
    cross_date,
    days_since: int,
    close: float | None,
    short_window: int,
    long_window: int,
) -> dict:
    return {
        "ticker": ticker,
        "data": {
            "ticker": ticker,
            "name": name,
            "date": cross_date.strftime("%Y-%m-%d"),
            "days_since_cross": days_since,
            "close": close,
            "short_ma": short_window,
            "long_ma": long_window,
        },
    }


# ── Pipeline helpers ───────────────────────────────────────────────

def load_existing_analysis(
    db: Session,
    analysis_type: str,
    market_ids: Sequence[int],
    companies: Sequence[Company],
    short_window: int,
    long_window: int,
) -> dict:
    """Return a {(company_id, market_id): AnalysisResult} map of cached results."""
    existing = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.analysis_type == analysis_type)
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .filter(AnalysisResult.market_id.in_(market_ids))
        .filter(AnalysisResult.company_id.in_([c.company_id for c in companies]))
        .all()
    )
    return {(r.company_id, r.market_id): r for r in existing}


def _is_golden_cache_hit(rec: AnalysisResult, now, days_to_look_back: int) -> bool:
    """Golden-cross: cached cross within look-back window."""
    if rec and rec.cross_date:
        return (now - rec.cross_date).days <= days_to_look_back
    return False


def _is_death_cache_hit(rec: AnalysisResult, now, days_to_look_back: int) -> bool:
    """Death-cross: cached cross within look-back window *and* days_since stored."""
    if (
        rec
        and rec.cross_date
        and (now - rec.cross_date).days <= days_to_look_back
        and rec.days_since_cross is not None
        and rec.days_since_cross <= days_to_look_back
    ):
        return True
    return False


def _is_fresh_no_cross(rec: AnalysisResult, now) -> bool:
    """Result was updated today but no cross was found — skip re-analysis."""
    return bool(rec and rec.last_updated and rec.last_updated.date() == now)


# For golden cross, also skip if rec exists AND cross_date is None AND updated today
def _is_golden_fresh_skip(rec: AnalysisResult, now) -> bool:
    return bool(rec and rec.last_updated and rec.last_updated.date() == now)


CACHE_HIT_FN = {
    "golden": _is_golden_cache_hit,
    "death": _is_death_cache_hit,
}


def filter_pairs_needing_update(
    companies: Sequence[Company],
    market_ids: Sequence[int],
    analysis_map: dict,
    now,
    days_to_look_back: int,
    short_window: int,
    long_window: int,
    results_out: list,
    analysis_type: str,
) -> list[tuple]:
    """
    Walk all companies, emit cached hits to *results_out*, and return
    `(company, market)` pairs that still need a fresh analysis.
    """
    is_cache_hit = CACHE_HIT_FN[analysis_type]
    market_id_set = set(market_ids)
    pairs_to_check: list[tuple] = []

    for comp in companies:
        mkt = comp.market
        if not mkt or mkt.market_id not in market_id_set:
            continue

        rec = analysis_map.get((comp.company_id, mkt.market_id))

        # Emit cached cross results immediately
        if is_cache_hit(rec, now, days_to_look_back):
            days_since = (
                rec.days_since_cross
                if rec.days_since_cross is not None
                else (now - rec.cross_date).days
            )
            results_out.append(
                _format_result(
                    comp.ticker, comp.name, rec.cross_date, days_since,
                    rec.cross_price, short_window, long_window,
                )
            )
            continue

        # Already checked today with no result → skip
        if rec and not rec.cross_date and _is_fresh_no_cross(rec, now):
            continue

        pairs_to_check.append((comp, mkt))

    return pairs_to_check


def fetch_price_history_for_pairs(
    db: Session,
    pairs_to_check: list[tuple],
    short_window: int,
    long_window: int,
    days_to_look_back: int,
) -> None:
    """Batch-fetch OHLC data from yfinance, grouped by market."""
    today = datetime.utcnow().date()
    lookback_days = long_window + days_to_look_back + 5
    start_date = today - timedelta(days=lookback_days)

    tickers_by_market: dict[str, list[str]] = {}
    for comp, mkt in pairs_to_check:
        tickers_by_market.setdefault(mkt.name, []).append(comp.ticker)

    BATCH_SIZE = 50
    for market_name, tickers in tickers_by_market.items():
        logger.info(
            "Preparing batches for market: %s, %d tickers", market_name, len(tickers)
        )
        for chunk in chunked(tickers, BATCH_SIZE):
            fetch_and_save_stock_price_history_data_batch(
                tickers=chunk,
                market_name=market_name,
                db=db,
                start_date=start_date,
                end_date=today,
                force_update=False,
            )


def analyze_and_build_results(
    db: Session,
    pairs_to_check: list[tuple],
    cross_type: str,
    short_window: int,
    long_window: int,
    days_to_look_back: int,
    min_volume: int,
    adjusted: bool,
    results_out: list,
) -> None:
    """Run per-pair analysis and append matching crosses to *results_out*."""
    now_date = datetime.utcnow().date()
    for comp, mkt in pairs_to_check:
        analysis_record = get_or_update_analysis_result(
            db=db,
            company=comp,
            market=mkt,
            cross_type=cross_type,
            short_window=short_window,
            long_window=long_window,
            days_to_look_back=days_to_look_back,
            min_volume=min_volume,
            adjusted=adjusted,
            stale_after_days=1,
        )
        if analysis_record and analysis_record.cross_date:
            days_since = (
                analysis_record.days_since_cross
                if analysis_record.days_since_cross is not None
                else (now_date - analysis_record.cross_date).days
            )
            if days_since <= days_to_look_back:
                results_out.append(
                    _format_result(
                        comp.ticker, comp.name,
                        analysis_record.cross_date, days_since,
                        analysis_record.cross_price,
                        short_window, long_window,
                    )
                )


# ── Main scan pipeline ─────────────────────────────────────────────

def run_cross_scan(
    db: Session,
    cross_type: str,  # "golden" or "death"
    markets: list[str] | None,
    basket_ids: list[int] | None,
    short_window: int,
    long_window: int,
    days_to_look_back: int,
    min_volume: int,
    adjusted: bool,
    min_market_cap: float | None = None,
) -> dict:
    """
    Unified scan pipeline for golden-cross and death-cross.

    Returns ``{"status": "success", "data": [...]}``.
    """
    analysis_type = f"{cross_type}_cross"  # "golden_cross" / "death_cross"

    start_time = time.time()
    results: list[dict] = []

    # 1) Resolve universe
    market_ids, companies = resolve_universe(db, markets, basket_ids)
    if not companies:
        return {"status": "success", "data": []}

    # 1.5) Market-cap filter
    if min_market_cap:
        companies = filter_by_market_cap(db, companies, min_market_cap)
        if not companies:
            logger.info("No companies left after market cap filter.")
            return {"status": "success", "data": []}

    # 2) Load cached analysis
    analysis_map = load_existing_analysis(
        db, analysis_type, market_ids, companies, short_window, long_window,
    )
    logger.info(
        "companies_to_check: %d (first 10): %s",
        len(companies),
        [c.ticker for c in companies[:10]],
    )

    now = datetime.utcnow().date()

    # 3) Separate cached hits from pairs needing fresh analysis
    pairs_to_check = filter_pairs_needing_update(
        companies, market_ids, analysis_map, now,
        days_to_look_back, short_window, long_window,
        results, cross_type,
    )
    logger.info(
        "pairs_to_check: %d (first 10): %s",
        len(pairs_to_check),
        [(c.ticker, m.name) for c, m in pairs_to_check[:10]],
    )

    # 4) Fetch price history for fresh pairs
    if pairs_to_check:
        fetch_price_history_for_pairs(
            db, pairs_to_check, short_window, long_window, days_to_look_back,
        )

    # 5) Analyse and collect results
    analyze_and_build_results(
        db, pairs_to_check, cross_type=cross_type,
        short_window=short_window, long_window=long_window,
        days_to_look_back=days_to_look_back, min_volume=min_volume,
        adjusted=adjusted, results_out=results,
    )

    elapsed = time.time() - start_time
    logger.info(
        "%s-cross checked %d companies (%d fresh) in %.2fs",
        cross_type.title(), len(companies), len(pairs_to_check), elapsed,
    )

    results.sort(key=lambda x: x["ticker"])
    return {"status": "success", "data": results}
