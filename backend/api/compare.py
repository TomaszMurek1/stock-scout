from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.base import get_db
from database.company import Company
from database.financials import CompanyFinancialHistory
from database.stock_data import StockPriceHistory, CompanyMarketData
from utils.sanitize import sanitize_numpy_types

router = APIRouter()


# ---------- internal helpers -------------------------------------------------
def _get_company(db: Session, ticker: str) -> Company:
    company = db.query(Company).filter(Company.ticker == ticker.upper()).first()
    if not company:
        raise HTTPException(
            status_code=404, detail=f"Company '{ticker.upper()}' not found"
        )
    return company


def _get_history(db: Session, cid: int) -> List[CompanyFinancialHistory]:
    return (
        db.query(CompanyFinancialHistory)
        .filter(CompanyFinancialHistory.company_id == cid)
        .filter(CompanyFinancialHistory.period_type == "annual")
        .order_by(CompanyFinancialHistory.report_end_date)
        .all()
    )


def _yoy(series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert an absolute-value series into YoY % growth.
    Input:  [{'period': '2020', 'value': 1234}, …]
    """
    out: List[Dict[str, Any]] = []
    for i in range(1, len(series)):
        prev, curr = series[i - 1]["value"], series[i]["value"]
        growth = None if not prev else ((curr - prev) / prev) * 100
        out.append({"period": series[i]["period"], "value": growth})
    return out


# ---------- snapshot compiler -----------------------------------------------
def _build_snapshot(db: Session, company: Company) -> Dict[str, Any]:
    history = _get_history(db, company.company_id)

    # --- revenue -------------------------------------------------------------
    rev_series = [
        {"period": h.report_end_date.year, "value": h.total_revenue} for h in history
    ]
    revenue_growth = _yoy(rev_series)

    # --- free cash-flow ------------------------------------------------------
    fcf_series = [
        {"period": h.report_end_date.year, "value": h.free_cash_flow} for h in history
    ]
    fcf_growth = _yoy(fcf_series)

    # --- dilution  (Δ shares outstanding YoY) -------------------------------
    sh_series = [
        {"period": h.report_end_date.year, "value": h.shares_outstanding or 0}
        for h in history
    ]
    dilution = _yoy(sh_series)

    # --- debt / equity proxy  (total_debt ÷ total_revenue) -------------------
    debt_equity = [
        {
            "period": h.report_end_date.year,
            "value": (
                None if not h.total_revenue else (h.total_debt or 0) / h.total_revenue
            ),
        }
        for h in history
    ]

    # --- latest LTM margins ---------------------------------------------------
    gross_margin = fcf_margin = None
    if history:
        ltm = history[-1]
        if ltm.gross_profit and ltm.total_revenue:
            gross_margin = 100 * ltm.gross_profit / ltm.total_revenue
        if ltm.free_cash_flow and ltm.total_revenue:
            fcf_margin = 100 * ltm.free_cash_flow / ltm.total_revenue

    # --- return on capital proxy (EBIT / assets) ------------------------------
    roc_series = [
        {"period": h.report_end_date.year, "value": h.ebit or 0} for h in history
    ]
    return_on_capital = _yoy(roc_series)

    # --- five-year share-price perf. -----------------------------------------
    five_years_ago = datetime.utcnow().date() - timedelta(days=365 * 5)
    prices = (
        db.query(StockPriceHistory)
        .filter(
            StockPriceHistory.company_id == company.company_id,
            StockPriceHistory.date >= five_years_ago,
        )
        .order_by(StockPriceHistory.date)
        .all()
    )
    price_perf = []
    if prices:
        base = prices[0].close or 1
        price_perf = [
            {"date": p.date.isoformat(), "value": 100 * (p.close / base - 1)}
            for p in prices
        ]

    # --- valuation  (P / FCF) -------------------------------------------------
    md = (
        db.query(CompanyMarketData)
        .filter(CompanyMarketData.company_id == company.company_id)
        .first()
    )
    p_fcf = None
    if md and history and history[-1].free_cash_flow:
        p_fcf = (md.market_cap or 0) / history[-1].free_cash_flow

    return {
        "ticker": company.ticker,
        "name": company.name,
        "revenue_growth": revenue_growth,
        "fcf_growth": fcf_growth,
        "dilution": dilution,
        "debt_equity": debt_equity,
        "margins": {"gross": gross_margin, "fcf": fcf_margin},
        "return_on_capital": return_on_capital,
        "price_performance": price_perf,
        "valuation": {"pfcf": p_fcf},
    }


# ---------- public route ------------------------------------------------------
@router.get("/{ticker_a}/{ticker_b}")
def compare(ticker_a: str, ticker_b: str, db: Session = Depends(get_db)):
    company_a = _get_company(db, ticker_a)
    company_b = _get_company(db, ticker_b)
    payload = {
        "as_of": datetime.utcnow().isoformat(),
        "a": _build_snapshot(db, company_a),
        "b": _build_snapshot(db, company_b),
    }
    return sanitize_numpy_types(payload)
