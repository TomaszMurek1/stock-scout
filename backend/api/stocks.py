from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.base import get_db
from datetime import datetime, timedelta, timezone
import logging
from database.company import Company, CompanyOverview
from database.market import Market
from database.financials import CompanyFinancials
from database.stock_data import StockPriceHistory
import requests
import os
from utils.cleaning import clean_nan_values
from utils.comparables import build_peer_comparisons
from utils.financial_utils import calculate_financial_ratios
from utils.insights import (
    build_extended_technical_analysis,
    build_financial_trends,
    build_investor_metrics,
)
from utils.sanitize import sanitize_numpy_types
from utils.valuation import build_valuation_metrics
from services.yfinance_data_update.data_update_service import ensure_fresh_data

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def fetch_company_overview_from_api(ticker: str) -> dict:
    api_key = os.getenv("FMP_API_KEY")
    url = (
        f"https://financialmodelingprep.com/stable/profile?symbol={ticker}"
        f"&apikey={api_key}"
    )
    response = requests.get(url)
    if response.status_code != 200:
        # You might want to log this!
        logger.warning(
            f"FMP API fetch failed for {ticker} with code {response.status_code}"
        )
        return _empty_overview(ticker)
    data = response.json()
    if not data:
        logger.info(f"No data from FMP for {ticker}")
        return _empty_overview(ticker)
    profile = data[0]
    return {
        "long_name": profile.get("companyName") or ticker,
        "short_name": profile.get("symbol") or ticker,
        "industry": profile.get("industry") or "N/A",
        "sector": profile.get("sector") or "N/A",
        "full_time_employees": profile.get("fullTimeEmployees") or None,
        "website": profile.get("website") or "",
        "headquarters_address": profile.get("address") or "",
        "headquarters_city": profile.get("city") or "",
        "headquarters_country": profile.get("country") or "",
        "phone": profile.get("phone") or "",
        "description": profile.get("description") or "No overview available.",
    }


def _empty_overview(ticker: str) -> dict:
    return {
        "long_name": ticker,
        "short_name": ticker,
        "industry": "N/A",
        "sector": "N/A",
        "full_time_employees": None,
        "website": "",
        "headquarters_address": "",
        "headquarters_city": "",
        "headquarters_country": "",
        "phone": "",
        "description": "No overview available.",
    }


def get_or_fetch_stock_price_history(
    ticker: str, market_name: str, company_id: int, cutoff_date: datetime, db: Session
):
    logger.info(f"cutoff_date {cutoff_date} for {ticker}")
    stock_price_history = (
        db.query(StockPriceHistory.date, StockPriceHistory.close)
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.date >= cutoff_date)
        .order_by(StockPriceHistory.date)
        .all()
    )
    # If not found, fetch new data
    if not stock_price_history:
        logger.warning(f"No stock history found for {ticker}, fetching from source...")
        ensure_fresh_data(ticker, market_name, False, db)
        db.expire_all()
        # Retry fetching
        stock_price_history = (
            db.query(StockPriceHistory.date, StockPriceHistory.close)
            .filter(StockPriceHistory.company_id == company_id)
            .filter(StockPriceHistory.date >= cutoff_date)
            .order_by(StockPriceHistory.date)
            .all()
        )
    return stock_price_history


def get_company_by_ticker(ticker: str, db: Session) -> Company:
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        logger.error(f"Company not found for ticker {ticker}")
        raise HTTPException(
            status_code=404, detail="Company not found for this ticker."
        )
    return company


def get_company_market(company: Company, db: Session) -> Market | None:
    return company.market


def get_company_financials(company: Company, db: Session) -> dict:
    financials = (
        db.query(CompanyFinancials)
        .filter(CompanyFinancials.company_id == company.company_id)
        .first()
    )
    if not financials:
        logger.warning(f"Financial data not found for {company.ticker}")
        raise HTTPException(
            status_code=404,
            detail=(
                "Financial data not found for this ticker. "
                "The company may be delisted or there is no recent financial report."
            ),
        )
    ratios = calculate_financial_ratios(financials)
    return {
        "gross_margin": ratios["gross_margin"],
        "operating_margin": ratios["operating_margin"],
        "net_margin": ratios["net_margin"],
        "shares_outstanding": financials.shares_outstanding,
    }


def build_executive_summary(company: Company, market: Market | None) -> dict:
    return {
        "ticker": company.ticker,
        "name": company.name,
        "sector": company.sector,
        "industry": company.industry,
        "currency": market.currency if market else "Unknown",
    }


@router.get("/{ticker}")
def get_stock_details(
    ticker: str,
    short_window: int = Query(50, ge=1, description="Short MA window in days"),
    long_window: int = Query(200, ge=1, description="Long MA window in days"),
    db: Session = Depends(get_db),
):
    company = get_company_by_ticker(ticker, db)
    market = get_company_market(company, db)
    if not market:
        logger.warning(f"Market not found for ticker {ticker}")
        raise HTTPException(
            status_code=404,
            detail=(
                "Market not found for this company. "
                "The ticker may be delisted or market data unavailable."
            ),
        )

    ensure_fresh_data(company.ticker, market.name, False, db)

    overview = company.overview
    if not overview:
        try:
            overview_data = fetch_company_overview_from_api(ticker)
        except HTTPException as ex:
            logger.error(f"Failed to fetch overview for {ticker}: {ex.detail}")
            raise
        existing = db.query(CompanyOverview).get(company.company_id)
        if existing:
            for key, value in overview_data.items():
                setattr(existing, key, value)
            db.commit()
            db.refresh(existing)
            overview = existing
        else:
            new_overview = CompanyOverview(
                company_id=company.company_id, **overview_data
            )
            db.add(new_overview)
            db.commit()
            db.refresh(new_overview)
            overview = new_overview

    executive_summary = build_executive_summary(company, market)
    financial_performance = get_company_financials(company, db)
    financials = (
        db.query(CompanyFinancials)
        .filter(CompanyFinancials.company_id == company.company_id)
        .first()
    )
    if not financials:
        logger.warning(f"Financials not found for ticker {ticker}")
        raise HTTPException(
            status_code=404,
            detail=(
                "Financial data not found for this ticker. "
                "The company may be delisted or there is no recent financial report."
            ),
        )

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=730)
    stock_history = get_or_fetch_stock_price_history(
        ticker,
        market.name,
        company.company_id,
        cutoff_date,
        db,
    )
    if not stock_history:
        logger.warning(f"Stock price history not found for ticker {ticker}")
        raise HTTPException(status_code=404, detail="Stock price history not found.")

    trends = build_financial_trends(db, company.company_id, market.market_id)
    investor_metrics = build_investor_metrics(financials, trends)
    valuation_metrics = build_valuation_metrics(company, financials, db)
    raw_technical_analysis = build_extended_technical_analysis(
        stock_history, short_window=short_window, long_window=long_window
    )
    technical_analysis = clean_nan_values(raw_technical_analysis)
    risk_metrics = {}  # build_risk_metrics(company, stock_history, db)  # Placeholder
    peer_comparison = build_peer_comparisons(company, db)

    response = {
        "executive_summary": executive_summary,
        "company_overview": {
            "description": overview.description,
            "website": overview.website,
            "sector": overview.sector,
            "industry": overview.industry,
            "country": overview.headquarters_country,
        },
        "financial_performance": financial_performance,
        "investor_metrics": investor_metrics,
        "valuation_metrics": valuation_metrics,
        "financial_trends": trends,
        "technical_analysis": technical_analysis,
        "risk_metrics": risk_metrics,
        "peer_comparison": peer_comparison,
    }
    return sanitize_numpy_types(response)
