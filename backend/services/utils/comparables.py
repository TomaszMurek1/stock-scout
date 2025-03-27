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

# Pick the first market (or decide logic here)
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

    pe_list = [peer.pe_ratio for peer in peers if peer.pe_ratio is not None]
    ev_ebitda_list = [peer.ev_to_ebitda for peer in peers if peer.ev_to_ebitda is not None]
    pb_list = [peer.pb_ratio for peer in peers if peer.pb_ratio is not None]
    div_list = [peer.dividend_yield for peer in peers if peer.dividend_yield is not None]
    rev_growth_list = [peer.revenue_growth for peer in peers if hasattr(peer, "revenue_growth") and peer.revenue_growth is not None]

    return {
        "p_e_ratio": {"industry_avg": to_python(rounded_safe_avg(pe_list))},
        "ev_ebitda": {"industry_avg": to_python(rounded_safe_avg(ev_ebitda_list))},
        "p_b_ratio": {"industry_avg": to_python(rounded_safe_avg(pb_list))},
        "dividend_yield": {"industry_avg": to_python(rounded_safe_avg(div_list))},
        "revenue_growth": {"industry_avg": to_python(rounded_safe_avg(rev_growth_list))},
    }
