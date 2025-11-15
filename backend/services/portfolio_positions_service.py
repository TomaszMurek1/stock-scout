from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from database.position import PortfolioPositions
from database.company import Company
from database.stock_data import CompanyMarketData
from database.fx import FxRate




def get_holdings_for_user(db: Session, portfolio) -> List[dict]:
    """
    Returns a list of holdings for the given portfolio:
    [
        {
            "ticker": "AAPL",
            "name": "Apple",
            "shares": ...,
            "instrument_ccy": "USD",
            "average_cost_instrument_ccy": ...,
            "average_cost_portfolio_ccy": ...,
            "last_price": ...,
            "fx_rate_to_portfolio_ccy": 1.0 or last FX rate
        }
    ]
    """

    # 1. Collect all accounts for this portfolio
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    # 2. Fetch positions
    positions = (
        db.query(PortfolioPositions)
        .options(joinedload(PortfolioPositions.company))
        .filter(PortfolioPositions.account_id.in_(account_ids))
        .all()
    )

    holdings = []
    portfolio_ccy = portfolio.currency

    for pos in positions:
        # Latest market data
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )

        # Determine FX rate instrument -> portfolio CCY
        instrument_ccy = pos.instrument_currency_code
        fx_rate_to_portfolio = None

        if instrument_ccy == portfolio_ccy:
            fx_rate_to_portfolio = 1.0
        else:
            fx_row: Optional[FxRate] = (
                db.query(FxRate)
                .filter_by(
                    base_currency=instrument_ccy,
                    quote_currency=portfolio_ccy,
                )
                .order_by(FxRate.date.desc())
                .first()
            )
            if fx_row:
                fx_rate_to_portfolio = float(fx_row.close)

        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "instrument_ccy": instrument_ccy,
                "average_cost_instrument_ccy": float(pos.avg_cost_instrument_ccy),
                "average_cost_portfolio_ccy": float(pos.avg_cost_portfolio_ccy),
                "last_price": (
                    float(latest_md.current_price)
                    if latest_md and latest_md.current_price is not None
                    else None
                ),
                "fx_rate_to_portfolio_ccy": fx_rate_to_portfolio,
            }
        )

    return holdings