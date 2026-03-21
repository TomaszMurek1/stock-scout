"""
Centralized SMA lookup from StockPriceHistory.

After removing sma_50/sma_200 columns from CompanyMarketData, all SMA data
comes from the latest row in StockPriceHistory for each company+market pair.
"""

import logging
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from database.company import Company
from database.stock_data import StockPriceHistory

logger = logging.getLogger(__name__)


def get_latest_smas_for_company(
    db: Session,
    company_id: int,
) -> dict[str, Optional[float]]:
    """
    Return { 'sma_50': float|None, 'sma_200': float|None } for a single
    company by reading the most recent StockPriceHistory row that has
    non-null SMA values.
    """
    company = db.query(Company).filter(Company.company_id == company_id).first()
    if not company or not company.market_id:
        return {"sma_50": None, "sma_200": None}

    row = (
        db.query(StockPriceHistory.sma_50, StockPriceHistory.sma_200)
        .filter(
            StockPriceHistory.company_id == company_id,
            StockPriceHistory.market_id == company.market_id,
        )
        .order_by(StockPriceHistory.date.desc())
        .first()
    )

    if not row:
        return {"sma_50": None, "sma_200": None}

    return {
        "sma_50": float(row.sma_50) if row.sma_50 is not None else None,
        "sma_200": float(row.sma_200) if row.sma_200 is not None else None,
    }


def get_latest_smas_bulk(
    db: Session,
    company_ids: set[int],
) -> dict[int, dict[str, Optional[float]]]:
    """
    Bulk-fetch latest SMA values for many companies at once.

    Returns { company_id: { 'sma_50': float|None, 'sma_200': float|None } }

    Uses a subquery to find the max(date) per (company_id, market_id),
    then joins back to get the actual sma_50/sma_200 values.
    """
    if not company_ids:
        return {}

    # Get each company's market_id
    company_markets = (
        db.query(Company.company_id, Company.market_id)
        .filter(Company.company_id.in_(company_ids))
        .filter(Company.market_id.isnot(None))
        .all()
    )

    if not company_markets:
        return {}

    cm_pairs = [(cid, mid) for cid, mid in company_markets]

    # Subquery: max date per (company_id, market_id)
    latest_date_sq = (
        db.query(
            StockPriceHistory.company_id,
            StockPriceHistory.market_id,
            func.max(StockPriceHistory.date).label("max_date"),
        )
        .filter(StockPriceHistory.company_id.in_([c for c, _ in cm_pairs]))
        .group_by(StockPriceHistory.company_id, StockPriceHistory.market_id)
        .subquery()
    )

    rows = (
        db.query(
            StockPriceHistory.company_id,
            StockPriceHistory.sma_50,
            StockPriceHistory.sma_200,
        )
        .join(
            latest_date_sq,
            (StockPriceHistory.company_id == latest_date_sq.c.company_id)
            & (StockPriceHistory.market_id == latest_date_sq.c.market_id)
            & (StockPriceHistory.date == latest_date_sq.c.max_date),
        )
        .all()
    )

    result: dict[int, dict[str, Optional[float]]] = {}
    for cid, sma50, sma200 in rows:
        result[cid] = {
            "sma_50": float(sma50) if sma50 is not None else None,
            "sma_200": float(sma200) if sma200 is not None else None,
        }

    return result
