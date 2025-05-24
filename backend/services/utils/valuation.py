import logging
from database.company import Company
from database.stock_data import CompanyMarketData
from database.financials import CompanyFinancials
from services.utils.insights import build_financial_trends


def build_valuation_metrics(
    company: Company, financials: CompanyFinancials, db
) -> dict:
    market_data = (
        db.query(CompanyMarketData).filter_by(company_id=company.company_id).first()
    )
    if not market_data or not financials:
        return {}

    price = market_data.current_price
    shares = market_data.shares_outstanding
    eps = (
        financials.diluted_eps
        if financials.diluted_eps not in (None, 0)
        else financials.basic_eps
    )
    net_income = financials.net_income

    # Safe market cap
    market_cap = (
        price * shares if (price is not None and shares not in (None, 0)) else None
    )

    # Safe P/E
    pe_ratio = price / eps if (price is not None and eps not in (None, 0)) else None

    pb_ratio = (
        market_data.price_to_book if market_data.price_to_book is not None else None
    )
    ev = financials.enterprise_value
    ebitda = financials.ebitda
    ev_ebitda = ev / ebitda if (ev is not None and ebitda not in (None, 0)) else None

    # Safe revenue growth from trends
    trends = build_financial_trends(db, company.company_id, financials.market_id)
    revenue_growth = None
    if trends.get("revenue") and len(trends["revenue"]) >= 2:
        recent = trends["revenue"][0].get("value")
        prev = trends["revenue"][1].get("value")
        if recent not in (None, 0) and prev not in (None, 0):
            revenue_growth = (recent - prev) / abs(prev) * 100

    eps_growth = None
    if trends.get("eps") and len(trends["eps"]) >= 2:
        eps_latest = trends["eps"][0].get("value")
        eps_prev = trends["eps"][1].get("value")
        if eps_latest not in (None, 0) and eps_prev not in (None, 0):
            eps_growth = ((eps_latest - eps_prev) / eps_prev) * 100

    # PEG Ratio safe
    peg_ratio = (
        (pe_ratio / eps_growth)
        if (pe_ratio not in (None, 0) and eps_growth not in (None, 0))
        else None
    )

    dividend_yield = getattr(market_data, "dividend_yield", None)
    dividend_yield = (
        round(dividend_yield, 4) if dividend_yield not in (None, 0) else None
    )

    return {
        "pe_ratio": round(pe_ratio, 2) if pe_ratio not in (None, 0) else None,
        "pb_ratio": round(pb_ratio, 2) if pb_ratio not in (None, 0) else None,
        "ev_ebitda": round(ev_ebitda, 2) if ev_ebitda not in (None, 0) else None,
        "peg_ratio": round(peg_ratio, 2) if peg_ratio not in (None, 0) else None,
        "dividend_yield": dividend_yield,
        "market_cap": round(market_cap, 2) if market_cap not in (None, 0) else None,
        "revenue_growth": (
            round(revenue_growth, 2) if revenue_growth not in (None, 0) else None
        ),
        "eps_growth": round(eps_growth, 2) if eps_growth not in (None, 0) else None,
    }
