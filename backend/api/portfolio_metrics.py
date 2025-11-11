# api/portfolio_metrics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from database.base import get_db
from database.portfolio import Portfolio
from services.portfolio_metrics_service import PortfolioMetricsService

router = APIRouter(prefix="/api/portfolio-metrics", tags=["Portfolio Metrics"])

@router.get("/{portfolio_id}/returns")
def get_portfolio_returns(
    portfolio_id: int,
    period: str = Query("ytd", description="Time period: daily, weekly, monthly, quarterly, yearly, ytd, qtd, mtd, wtd, itd"),
    end_date: Optional[date] = Query(None, description="End date (default: today)"),
    db: Session = Depends(get_db)
):
    """
    Get portfolio returns with breakdown for specified period
    """
    # Validate portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Set end date to today if not provided
    end_date = end_date or date.today()
    
    # Validate period
    valid_periods = ["daily", "weekly", "monthly", "quarterly", "yearly", "ytd", "qtd", "mtd", "wtd", "itd"]
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}")
    
    # Calculate metrics
    metrics_service = PortfolioMetricsService(db)
    period_data = metrics_service.calculate_period_returns(portfolio_id, end_date, period)
    
    if not period_data:
        raise HTTPException(status_code=400, detail="Could not calculate returns for the specified period")
    
    # Convert to percentages for display and handle edge cases
    ttwr_percent = float(period_data['ttwr'] * 100) if period_data['ttwr'] is not None else 0.0
    mwrr_percent = float(period_data['mwrr'] * 100) if period_data['mwrr'] is not None else 0.0
    
    response = {
        "portfolio_id": portfolio_id,
        "period": period,
        "start_date": period_data['start_date'].isoformat(),
        "end_date": period_data['end_date'].isoformat(),
        "returns": {
            "ttwr": ttwr_percent,
            "mwrr": mwrr_percent,
        },
        "breakdown": {
            "unrealized_gains": float(period_data['breakdown'].get('unrealized_gains', 0)),
            "realized_gains": float(period_data['breakdown'].get('realized_gains', 0)),
            "dividend_income": float(period_data['breakdown'].get('dividend_income', 0)),
            "interest_income": float(period_data['breakdown'].get('interest_income', 0)),
            "currency_effects": float(period_data['breakdown'].get('currency_effects', 0)),
            "fees_paid": float(period_data['breakdown'].get('fees_paid', 0)),
            "total_return": float(period_data['breakdown'].get('total_return', 0)),
        },
        "values": {
            "beginning_value": float(period_data['breakdown'].get('beginning_value', 0)),
            "ending_value": float(period_data['breakdown'].get('ending_value', 0)),
        }
    }
    
    return response


@router.get("/{portfolio_id}/performance")
def get_portfolio_performance(
    portfolio_id: int,
    end_date: Optional[date] = Query(None, description="End date (default: today)"),
    db: Session = Depends(get_db),
):
    """
    Returns fraction-based performance for standard windows in a structured payload:
    {
      unit: "fraction",
      performance: {
        "ttwr": {...},              # whole-portfolio TTWR (cash included)
        "ttwr_invested": {...},     # 'true investment performance' (invested-only TTWR; trades neutralized)
        "mwrr": {...}               # investor money-weighted XIRR
      }
    }
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    end_date = end_date or date.today()
    svc = PortfolioMetricsService(db)

    frames = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd", "itd"]
    ttwr: Dict[str, float] = {}
    ttwr_invested: Dict[str, float] = {}
    mwrr: Dict[str, float] = {}

    for f in frames:
        data = svc.calculate_period_returns(portfolio_id, end_date, f)
        if not data:
            ttwr[f] = 0.0
            ttwr_invested[f] = 0.0
            mwrr[f] = 0.0
            continue

        ttwr[f] = float(data["ttwr"])
        ttwr_invested[f] = float(data["ttwr_invested"])
        mwrr[f] = float(data["mwrr"])

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "unit": "fraction",
        "performance": {
            "ttwr": ttwr,
            "ttwr_invested": ttwr_invested,
            "mwrr": mwrr,
        },
        "notes": {
            "ttwr": "Whole-portfolio time-weighted return (includes cash). External flows (deposits/withdrawals) are neutralized daily.",
            "ttwr_invested": "Invested-only time-weighted return (excludes cash). Treats BUY as +flow and SELL as -flow to neutralize trading; reflects pure market performance of held assets.",
            "mwrr": "Money-weighted XIRR (investor IRR) using deposits(-), withdrawals(+), dividends(+), interest(+), fees/taxes(-), and terminal market value (+)."
        },
    }


def _to_float(o: Any):
    """
    Recursively convert Decimals (and other numeric types) to float, leave dict/list structure intact.
    """
    # Avoid importing Decimal here; compare by duck-typing
    try:
        from decimal import Decimal
        if isinstance(o, Decimal):
            return float(o)
    except Exception:
        pass

    if isinstance(o, dict):
        return {k: _to_float(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return type(o)(_to_float(x) for x in o)
    if isinstance(o, (int, float)) or o is None:
        return o
    # Fallback: try cast, else return as-is (strings, notes)
    try:
        return float(o)
    except Exception:
        return o


@router.get("/{portfolio_id}/performance/details")
def get_portfolio_performance_details(
    portfolio_id: int,
    period: str = Query("ytd", description="1d,1w,1m,3m,6m,1y,ytd,itd,qtd,mtd,wtd"),
    end_date: Optional[date] = Query(None, description="End date (default: today)"),
    db: Session = Depends(get_db),
):
    """
    Detailed view for a single period, including valuations, cash-flow summary, and a reconciling P&L.
    All figures are returned as fractions (e.g., 0.025 = 2.5%).
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    end_date = end_date or date.today()
    svc = PortfolioMetricsService(db)

    data = svc.calculate_period_returns(portfolio_id, end_date, period)
    if not data:
        raise HTTPException(status_code=400, detail="Could not calculate returns for the specified period")

    # Flatten Decimals to floats safely but preserve nested structure:
    br = _to_float(data.get("breakdown", {}))

    return {
        "portfolio_id": portfolio_id,
        "period": period,
        "unit": "fraction",
        "start_date": data["start_date"].isoformat(),
        "end_date": data["end_date"].isoformat(),
        "returns": _to_float({
            "ttwr": data["ttwr"],
            "ttwr_invested": data["ttwr_invested"],
            "mwrr": data["mwrr"],
        }),
        "valuations": {
            "beginning_value": br.get("beginning_value", 0.0),
            "ending_value": br.get("ending_value", 0.0),
        },
        "cash_flows": br.get("cash_flows", {}),
        "income_expenses": br.get("income_expenses", {}),
        "pnl": br.get("pnl", {}),
        "notes": {
            "performance_fields": "All performance figures are fractions (e.g., 0.025 = 2.5%).",
            "reconciliation": "EndingValue - BeginningValue - NetExternalFlows = TotalPnL (allocated across dividends, interest, fees, taxes, realized (approx), unrealized (residual), currency effects)."
        }
    }

@router.get("/{portfolio_id}/performance/details")
def get_portfolio_performance_details(
    portfolio_id: int,
    end_date: Optional[date] = Query(None, description="End date (default: today)"),
    db: Session = Depends(get_db),
):
    end_date = end_date or date.today()
    svc = PortfolioMetricsService(db)
    frames = ["1d","1w","1m","3m","6m","1y","ytd","itd"]

    details = {}
    for f in frames:
        start = svc.get_period_start_date(portfolio_id, end_date, f)
        if not start:
            continue
        ttwr = svc.calculate_ttwr(portfolio_id, start, end_date)
        mwrr = svc.calculate_mwrr(portfolio_id, start, end_date)
        breakdown = svc.calculate_returns_breakdown(portfolio_id, start, end_date)

        details[f] = {
            "start_date": start.isoformat(),
            "end_date": end_date.isoformat(),
            "ttwr_fraction": float(ttwr),
            "mwrr_fraction": float(mwrr),
            "ttwr_percent": float(ttwr * 100),
            "mwrr_percent": float(mwrr * 100),
            "breakdown": {k: float(v) for k,v in breakdown.items()},
        }

    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "details": details,
    }

@router.get("/{portfolio_id}/returns/multiple")
def get_multiple_period_returns(
    portfolio_id: int,
    periods: str = Query("1m,3m,6m,1y,ytd", description="Comma-separated periods"),
    end_date: Optional[date] = Query(None, description="End date (default: today)"),
    db: Session = Depends(get_db)
):
    """
    Get returns for multiple periods in one request
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    end_date = end_date or date.today()
    period_list = [p.strip() for p in periods.split(",")]
    
    metrics_service = PortfolioMetricsService(db)
    results = {}
    
    for period in period_list:
        try:
            period_data = metrics_service.calculate_period_returns(portfolio_id, end_date, period)
            
            if period_data:
                results[period] = {
                    "ttwr": float(period_data['ttwr'] * 100) if period_data['ttwr'] else 0.0,
                    "mwrr": float(period_data['mwrr'] * 100) if period_data['mwrr'] else 0.0,
                    "start_date": period_data['start_date'].isoformat(),
                    "end_date": period_data['end_date'].isoformat()
                }
            else:
                results[period] = {
                    "ttwr": 0.0,
                    "mwrr": 0.0,
                    "start_date": end_date.isoformat(),
                    "end_date": end_date.isoformat()
                }
                
        except Exception:
            results[period] = {
                "ttwr": 0.0,
                "mwrr": 0.0,
                "start_date": end_date.isoformat(),
                "end_date": end_date.isoformat()
            }
    
    return {
        "portfolio_id": portfolio_id,
        "as_of_date": end_date.isoformat(),
        "returns": results
    }