from dis import Positions
from enum import Enum
from typing import List
from sqlalchemy.orm import Session

from database.company import Company
from database.market import Market, StockIndex
from database.portfolio import PortfolioPosition
# (Favorites model omitted – you can plug it in later)


class BasketType(str, Enum):
    MARKET = "market"
    INDEX = "index"
    PORTFOLIO = "portfolio"
    FAVORITES = "favorites"



def get_companies_for_market_basket(
    db: Session,
    market_code: str | None = None,
    market_id: int | None = None,
) -> List[Company]:
    """
    BASKET TYPE 1: all companies listed on a given market (XWAR, XNYS, etc.).
    You can identify the market either by exchange_code or by id.
    """
    query = db.query(Company).join(Market)

    if market_id is not None:
        query = query.filter(Market.market_id == market_id)
    elif market_code is not None:
        query = query.filter(Market.exchange_code == market_code)
    else:
        raise ValueError("Either market_code or market_id must be provided")

    return query.all()


def get_companies_for_index_basket(
    db: Session,
    index_name: str | None = None,
    index_id: int | None = None,
) -> List[Company]:
    """
    BASKET TYPE 2: all companies belonging to a given index.
    Uses stock_indexes + company_stockindex_association you already have.
    """
    query = db.query(Company).join(Company.stock_indexes)

    if index_id is not None:
        query = query.filter(StockIndex.index_id == index_id)
    elif index_name is not None:
        query = query.filter(StockIndex.name == index_name)
    else:
        raise ValueError("Either index_name or index_id must be provided")

    return query.all()


def get_companies_for_portfolio_basket(
    db: Session,
    portfolio_id: int,
    only_open_positions: bool = True,
) -> List[Company]:
    """
    BASKET TYPE 3: all companies currently held in a portfolio.
    On the fly – no Basket table needed, just Positions.
    """
    query = (
        db.query(Company)
        .join(Positions, Positions.company_id == Company.company_id)
        .filter(Positions.portfolio_id == portfolio_id)
    )

    if only_open_positions:
        query = query.filter(Positions.quantity > 0)

    return query.all()