from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from database.position import PortfolioPositions
from database.company import Company
from database.stock_data import CompanyMarketData


def get_holdings_for_user(db: Session, portfolio) -> List[dict]:
    """
    Returns a list of holdings for the given portfolio:
    [
        {
            "ticker": "AAPL",
            "name": "Apple",
            "shares": 10.5,
            "average_cost": 150.0,
            "average_cost_currency": "USD",
            "last_price": 172.4,
            "market_currency": "USD"
        }
    ]
    """

    # 1. Gather account IDs for this portfolio
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    # 2. Load positions for all accounts
    positions = (
        db.query(PortfolioPositions)
        .options(joinedload(PortfolioPositions.company))
        .filter(PortfolioPositions.account_id.in_(account_ids))
        .all()
    )

    holdings = []

    for pos in positions:
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),    
                "instrument_ccy": pos.instrument_currency_code,
                "average_cost_instrument_ccy": float(pos.avg_cost_instrument_ccy),
                "average_cost_portfolio_ccy": float(pos.avg_cost_portfolio_ccy),
                "last_price": (
                    float(latest_md.current_price)
                    if latest_md and latest_md.current_price is not None
                    else None
                ),
            }
        )

    return holdings