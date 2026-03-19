"""
Data refresh endpoints for n8n cron integration + admin manual triggers.

Two core refresh jobs:
1. Daily price refresh for all companies
2. Daily fundamental data refresh (smart quarterly/annual check)

Each job is exposed via two auth paths:
- n8n endpoints (X-Internal-Token)
- admin endpoints (JWT + require_admin)

Note: Near-live price refresh for active users is already handled on-demand
by `ensure_portfolio_prices_fresh` in portfolio_positions_service.py
(triggered on dashboard load with 60-min staleness threshold).
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from api.alert_checker import verify_internal_token
from database.base import get_db
from database.company import Company
from database.stock_data import CompanyMarketData
from services.auth.authorization import require_admin
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)
from services.scan_job_service import create_job, get_active_job, start_job_in_thread
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from utils.itertools_helpers import chunked

router = APIRouter()
logger = logging.getLogger(__name__)

BATCH_SIZE = 50


# ── Helpers ──────────────────────────────────────────────────────────────────


def _get_all_companies_by_market(db: Session) -> dict[str, list[str]]:
    """
    Return all non-delisted companies grouped by market name.
    Skips companies without a market assignment.
    """
    companies = (
        db.query(Company)
        .options(joinedload(Company.market))
        .filter(Company.market_id.isnot(None))
        .all()
    )

    # Filter out delisted tickers (market_cap == 0 updated recently)
    now_utc = datetime.now(timezone.utc)
    md_map = {
        md.company_id: md
        for md in db.query(CompanyMarketData)
        .filter(
            CompanyMarketData.company_id.in_([c.company_id for c in companies])
        )
        .all()
    }

    grouped: dict[str, list[str]] = {}
    for comp in companies:
        md = md_map.get(comp.company_id)
        if md and md.market_cap == 0:
            last_up = md.last_updated
            if last_up:
                if last_up.tzinfo is None:
                    last_up = last_up.replace(tzinfo=timezone.utc)
                if (now_utc - last_up).days < 7:
                    continue  # skip known delisted/failed

        market_name = comp.market.name
        grouped.setdefault(market_name, []).append(comp.ticker)

    return grouped


# ── Core job runners ─────────────────────────────────────────────────────────


def _run_daily_prices(db: Session):
    """Refresh price history for ALL companies in the database."""
    tickers_by_market = _get_all_companies_by_market(db)
    total = sum(len(t) for t in tickers_by_market.values())
    logger.info(f"[daily-prices] Starting refresh for {total} tickers across {len(tickers_by_market)} markets")

    results = []
    for market_name, tickers in tickers_by_market.items():
        for chunk in chunked(tickers, BATCH_SIZE):
            try:
                resp = fetch_and_save_stock_price_history_data_batch(
                    tickers=list(chunk),
                    market_name=market_name,
                    db=db,
                    start_date=None,
                    end_date=None,
                    force_update=False,
                )
                results.append({
                    "market": market_name,
                    "count": len(chunk),
                    "inserted": resp.get("inserted", 0),
                    "status": "success",
                })
            except Exception as e:
                logger.error(f"[daily-prices] Error for {market_name} batch: {e}")
                results.append({
                    "market": market_name,
                    "count": len(chunk),
                    "status": "error",
                    "error": str(e),
                })

    logger.info(f"[daily-prices] Done. Processed {total} tickers.")
    return {"total_tickers": total, "results": results}


def _run_daily_fundamentals(db: Session):
    """
    Refresh fundamental data for ALL companies.
    Leverages update_financials_for_tickers() which has built-in smart skip logic:
    - Skips if annual report < 350 days old
    - Skips if quarterly report < 80 days old
    - Skips delisted/failed tickers (market_cap == 0)
    - Skips if already checked today
    """
    tickers_by_market = _get_all_companies_by_market(db)
    total = sum(len(t) for t in tickers_by_market.values())
    logger.info(f"[daily-fundamentals] Starting check for {total} tickers across {len(tickers_by_market)} markets")

    results = []
    for market_name, tickers in tickers_by_market.items():
        try:
            resp = update_financials_for_tickers(
                db=db,
                tickers=tickers,
                market_name=market_name,
                batch_size=BATCH_SIZE,
                include_quarterly=True,
            )
            results.append({
                "market": market_name,
                "total_tickers": len(tickers),
                "updated": resp.get("updated", 0) if resp else 0,
                "status": "success",
            })
        except Exception as e:
            logger.error(f"[daily-fundamentals] Error for {market_name}: {e}")
            results.append({
                "market": market_name,
                "total_tickers": len(tickers),
                "status": "error",
                "error": str(e),
            })

    logger.info(f"[daily-fundamentals] Done. Checked {total} tickers.")
    return {"total_tickers": total, "results": results}


# ── n8n endpoints (internal token auth) ──────────────────────────────────────


@router.post("/n8n-daily-prices")
def daily_prices(
    db: Session = Depends(get_db),
    _=Depends(verify_internal_token),
):
    """
    Refresh price data for ALL companies in the database.
    Designed to be called once daily by n8n after market close.
    """
    existing = get_active_job(db, "n8n_daily_price_refresh")
    if existing:
        return {"job_id": existing.id, "status": existing.status, "already_running": True}

    job = create_job(db, "n8n_daily_price_refresh")

    def task_wrapper(db_session: Session):
        return _run_daily_prices(db_session)

    start_job_in_thread(job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING", "already_running": False}


@router.post("/n8n-daily-fundamentals")
def daily_fundamentals(
    db: Session = Depends(get_db),
    _=Depends(verify_internal_token),
):
    """
    Check and refresh fundamental data for ALL companies.
    Smart skip logic avoids unnecessary yfinance API calls.
    Designed to be called once daily by n8n.
    """
    existing = get_active_job(db, "n8n_daily_fundamentals_refresh")
    if existing:
        return {"job_id": existing.id, "status": existing.status, "already_running": True}

    job = create_job(db, "n8n_daily_fundamentals_refresh")

    def task_wrapper(db_session: Session):
        return _run_daily_fundamentals(db_session)

    start_job_in_thread(job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING", "already_running": False}


# ── Admin endpoints (JWT auth) ───────────────────────────────────────────────


@router.post("/admin-daily-prices")
def admin_daily_prices(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Manually trigger a full price refresh for ALL companies.
    Same logic as the n8n endpoint, but accessible from the admin UI.
    """
    existing = get_active_job(db, "admin_daily_price_refresh")
    if existing:
        return {"job_id": existing.id, "status": existing.status, "already_running": True}

    job = create_job(db, "admin_daily_price_refresh")

    def task_wrapper(db_session: Session):
        return _run_daily_prices(db_session)

    start_job_in_thread(job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING", "already_running": False}


@router.post("/admin-daily-fundamentals")
def admin_daily_fundamentals(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """
    Manually trigger a full fundamentals refresh for ALL companies.
    Same logic as the n8n endpoint, but accessible from the admin UI.
    """
    existing = get_active_job(db, "admin_daily_fundamentals_refresh")
    if existing:
        return {"job_id": existing.id, "status": existing.status, "already_running": True}

    job = create_job(db, "admin_daily_fundamentals_refresh")

    def task_wrapper(db_session: Session):
        return _run_daily_fundamentals(db_session)

    start_job_in_thread(job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING", "already_running": False}

