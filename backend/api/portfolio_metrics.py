# api/portfolio_metrics.py
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from services.portfolio_metrics_service import PortfolioMetricsService
from database.base import get_db  # adjust import if your dependency is elsewhere

router = APIRouter(prefix="/api/portfolio-metrics", tags=["portfolio-metrics"])

# Periods we compute
PERIODS = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd", "itd"]


# ---- helpers ----
def _to_float(v):
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (int, float)):
        return float(v)
    return v


def _serialize_breakdown(breakdown: Dict):
    """Convert all Decimals in the breakdown dict to floats, preserve structure."""
    if breakdown is None:
        return {}
    if isinstance(breakdown, dict):
        out = {}
        for k, v in breakdown.items():
            out[k] = _serialize_breakdown(v)
        return out
    if isinstance(breakdown, list):
        return [_serialize_breakdown(x) for x in breakdown]
    return _to_float(breakdown)


def _parse_as_of_date(as_of: Optional[str]) -> date:
    if not as_of:
        return date.today()
    try:
        # accept YYYY-MM-DD
        return datetime.strptime(as_of, "%Y-%m-%d").date()
    except ValueError:
        # accept ISO datetime and take date part
        try:
            return datetime.fromisoformat(as_of).date()
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid as_of_date: {as_of}")


# ===========================
# GET /{portfolio_id}/performance  (summary)
# ===========================
@router.get("/{portfolio_id}/performance")
def get_portfolio_performance(
    portfolio_id: int,
    as_of_date: Optional[str] = Query(None, description="Defaults to today (server date)"),
    as_percent: bool = Query(False, description="Kept for backward compatibility; ignored, returns fraction."),
    include_breakdown: bool = Query(False, description="If true, include per-period breakdown + dates in response."),
    db: Session = Depends(get_db),
):
    """
    Returns performance summary (ttwr, ttwr_invested, mwrr) as fractions.
    If include_breakdown=true, also returns start_date/end_date per period and breakdowns.
    """
    svc = PortfolioMetricsService(db)
    end_date = _parse_as_of_date(as_of_date)

    # main blocks
    ttwr_map: Dict[str, float] = {}
    inv_map: Dict[str, float] = {}
    mwrr_map: Dict[str, float] = {}

    # Optional period meta / breakdowns
    start_dates: Dict[str, str] = {}
    end_dates: Dict[str, str] = {}
    breakdowns: Dict[str, dict] = {}

    for p in PERIODS:
        start = svc.get_period_start_date(portfolio_id, end_date, p)
        if not start:
            # skip if portfolio has no history yet
            continue

        ttwr = svc.calculate_ttwr(portfolio_id, start, end_date)
        ttwr_invested = svc.calculate_ttwr_invested_only(portfolio_id, start, end_date)
        mwrr = svc.calculate_mwrr(portfolio_id, start, end_date)

        ttwr_map[p] = _to_float(ttwr or 0)
        inv_map[p] = _to_float(ttwr_invested or 0)
        mwrr_map[p] = _to_float(mwrr or 0)

        if include_breakdown:
            bd = svc.calculate_returns_breakdown(portfolio_id, start, end_date)
            breakdowns[p] = _serialize_breakdown(bd)
            start_dates[p] = start.isoformat()
            end_dates[p] = end_date.isoformat()

    response = {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "unit": "fraction",
        "performance": {
            "ttwr": ttwr_map,
            "ttwr_invested": inv_map,
            "mwrr": mwrr_map,
        },
        "notes": {
            "ttwr": "Whole-portfolio time-weighted return (includes cash). External flows (deposits/withdrawals) are neutralized daily.",
            "ttwr_invested": "Invested-only time-weighted return (excludes cash). Treats BUY as +flow and SELL as -flow to neutralize trading; reflects pure market performance of held assets.",
            "mwrr": "Money-weighted XIRR (investor IRR) using deposits(-), withdrawals(+), dividends(+), interest(+), fees/taxes(-), and terminal market value (+).",
        },
    }

    if include_breakdown:
        response["period_meta"] = {
            "start_date": start_dates,
            "end_date": end_dates,
        }
        response["breakdowns"] = breakdowns

    return response


# ===========================
# GET /{portfolio_id}/performance/details  (rich per-period objects)
# ===========================
@router.get("/{portfolio_id}/performance/details")
def get_portfolio_performance_details(
    portfolio_id: int,
    as_of_date: Optional[str] = Query(None, description="Defaults to today (server date)"),
    periods: Optional[str] = Query(None, description="Comma-separated list; default: 1d,1w,1m,3m,6m,1y,ytd,itd"),
    db: Session = Depends(get_db),
):
    """
    Verbose endpoint: for each period return:
      - start_date, end_date
      - ttwr, ttwr_invested, mwrr
      - breakdown block (reconciliation)
    """
    svc = PortfolioMetricsService(db)
    end_date = _parse_as_of_date(as_of_date)
    requested = [p.strip().lower() for p in (periods.split(",") if periods else PERIODS)]

    out: Dict[str, dict] = {}

    for p in requested:
        start = svc.get_period_start_date(portfolio_id, end_date, p)
        if not start:
            # If no data to anchor this period, skip
            continue

        data = svc.calculate_period_returns(portfolio_id, end_date, p)
        # data includes: start_date, end_date, ttwr, ttwr_invested, mwrr, breakdown

        out[p] = {
            "start_date": data.get("start_date").isoformat() if data.get("start_date") else None,
            "end_date": data.get("end_date").isoformat() if data.get("end_date") else None,
            "ttwr": _to_float(data.get("ttwr")),
            "ttwr_invested": _to_float(data.get("ttwr_invested")),
            "mwrr": _to_float(data.get("mwrr")),
            "breakdown": _serialize_breakdown(data.get("breakdown")),
        }

    if not out:
        raise HTTPException(status_code=404, detail="No periods available for this portfolio")

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "unit": "fraction",
        "periods": out,
    }
