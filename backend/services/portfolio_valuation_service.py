from typing import Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from database.valuation import PortfolioValuationDaily


def get_latest_portfolio_valuation(db: Session, portfolio_id: int) -> Optional[dict]:
    pv = (
        db.query(PortfolioValuationDaily)
        .filter(PortfolioValuationDaily.portfolio_id == portfolio_id)
        .order_by(PortfolioValuationDaily.date.desc())
        .first()
    )

    if not pv:
        return None

    def _to_float(x):
        return float(x) if x is not None else 0.0

    total_value_raw = _to_float(pv.total_value)
    cash_available_raw = _to_float(pv.by_cash)

    total_value      = round(total_value_raw, 2)
    cash_available   = round(cash_available_raw, 2)
    total_invested   = round(total_value_raw - cash_available_raw, 2)

    return {
        "total_value": total_value,
        "cash_available": cash_available,
        "total_invested": total_invested,
        "date": pv.date.isoformat(),
    }