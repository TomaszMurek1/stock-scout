# services/utils/valuation.py
import logging
from database.models import Company, CompanyFinancials, CompanyMarketData
from services.utils.insights import build_financial_trends

def build_valuation_metrics(company: Company, financials: CompanyFinancials, db) -> dict:
    market_data = db.query(CompanyMarketData).filter_by(company_id=company.company_id).first()
    if not market_data or not financials:
        return {}

    price = market_data.current_price
    shares = market_data.shares_outstanding or 0
    eps = financials.diluted_eps or financials.basic_eps
    net_income = financials.net_income or 0

    market_cap = price * shares if price and shares else None
    pe_ratio = price / eps if eps else None
    pb_ratio = market_data.price_to_book
    ev = financials.enterprise_value
    ev_ebitda = ev / financials.ebitda if ev and financials.ebitda else None

    # Safe revenue growth from trends
    trends = build_financial_trends(db, company.company_id, financials.market_id)
    revenue_growth = None
    if trends.get("revenue") and len(trends["revenue"]) >= 2:
        recent = trends["revenue"][0]["value"]
        prev = trends["revenue"][1]["value"]
        if recent and prev:
            revenue_growth = (recent - prev) / abs(prev)

    eps_growth = None
    if trends.get("eps") and len(trends["eps"]) >= 2:
        eps_latest = trends["eps"][0]["value"]
        eps_prev = trends["eps"][1]["value"]
        if eps_latest and eps_prev and eps_latest > 0 and eps_prev > 0: 
            logging.info(f"EPS latest: {eps_latest} ")
            logging.info(f"EPS previous: {eps_prev} ")
            logging.info(f"EPS growth: {eps_latest} - {eps_prev} = {eps_growth}")
            eps_growth = ((eps_latest - eps_prev) / eps_prev) * 100

    peg_ratio = (pe_ratio / eps_growth)  if pe_ratio and eps_growth else None
    dividend_yield = getattr(market_data, "dividend_yield", None)

    return {
        "pe_ratio": round(pe_ratio, 2) if pe_ratio else None,
        "pb_ratio": round(pb_ratio, 2) if pb_ratio else None,
        "ev_ebitda": round(ev_ebitda, 2) if ev_ebitda else None,
        "peg_ratio": round(peg_ratio, 2) if peg_ratio else None,
        "dividend_yield": round(dividend_yield, 2) if dividend_yield else None,
    }