from sqlalchemy.orm import Session
from database.models import Company, CompanyFinancials, Market
import numpy as np

def safe_avg(vals):
    vals = [v for v in vals if v]
    return sum(vals) / len(vals) if vals else None

def rounded_safe_avg(values: list[float] | None, decimals: int = 2) -> float | None:
    avg = safe_avg(values)
    return round(avg, decimals) if avg is not None else None

def to_python(val):
    if isinstance(val, (np.generic,)):
        return val.item()
    return val

def build_peer_comparisons(company: Company, db: Session) -> dict:
    if not company.industry or not company.markets or len(company.markets) == 0:
        return {}

    market = company.markets[0]

    peers = (
        db.query(CompanyFinancials)
        .join(Company)
        .filter(
            Company.industry == company.industry,
            Company.markets.any(Market.market_id == market.market_id),
            Company.company_id != company.company_id
        )
        .all()
    )

    pe_list = []
    for peer in peers:
        eps = peer.diluted_eps or peer.basic_eps
        price = peer.current_price
        if price is not None and eps and eps > 0:
            pe_list.append(price / eps)

    ev_ebitda_list = []
    for peer in peers:
        if peer.ebitda not in (None, 0):
            market_cap = (
                peer.shares_outstanding * peer.current_price
                if peer.shares_outstanding and peer.current_price
                else 0
            )
            ev = peer.enterprise_value
            if ev is None:
                ev = market_cap + (peer.total_debt or 0) - (peer.cash_and_cash_equivalents or 0)
            ev_ebitda_list.append(ev / peer.ebitda)

    pb_list = []
    for peer in peers:
        price = peer.current_price
        equity = peer.enterprise_value - (peer.total_debt or 0) + (peer.cash_and_cash_equivalents or 0) if peer.enterprise_value else None
        if price is not None and equity and peer.shares_outstanding:
            book_value_per_share = equity / peer.shares_outstanding
            if book_value_per_share != 0:
                pb_list.append(price / book_value_per_share)

    div_list = []
    for peer in peers:
        market_cap = (
            peer.shares_outstanding * peer.current_price
            if peer.shares_outstanding and peer.current_price
            else None
        )
        if market_cap not in (None, 0):
            dividend_yield = (peer.dividends_paid or 0) / market_cap
            div_list.append(dividend_yield)

    rev_growth_list = [
        peer.revenue_growth for peer in peers
        if hasattr(peer, "revenue_growth") and peer.revenue_growth is not None
    ]

    return {
        "p_e_ratio": {"industry_avg": to_python(rounded_safe_avg(pe_list))},
        "ev_ebitda": {"industry_avg": to_python(rounded_safe_avg(ev_ebitda_list))},
        "p_b_ratio": {"industry_avg": to_python(rounded_safe_avg(pb_list))},
        "dividend_yield": {"industry_avg": to_python(rounded_safe_avg(div_list))},
        "revenue_growth": {"industry_avg": to_python(rounded_safe_avg(rev_growth_list))},
    }
