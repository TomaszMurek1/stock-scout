# services/refresh_baskets.py
from collections import defaultdict
from typing import List

from sqlalchemy.orm import Session

from database.company import Company
from services.baskets import (
    BasketType,
    get_companies_for_market_basket,
    get_companies_for_index_basket,
    get_companies_for_portfolio_basket,
)
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)


def _group_tickers_by_market(companies: List[Company]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for c in companies:
        if not c.market:
            continue
        grouped[c.market.name].append(c.ticker)
    return grouped


def refresh_basket(
    db: Session,
    basket_type: BasketType,
    *,
    market_code: str | None = None,
    market_id: int | None = None,
    index_name: str | None = None,
    index_id: int | None = None,
    portfolio_id: int | None = None,
    refresh_prices: bool = True,
    refresh_fundamentals: bool = True,
):
    # 1. Resolve companies based on basket type
    if basket_type == BasketType.MARKET:
        companies = get_companies_for_market_basket(
            db, market_code=market_code, market_id=market_id
        )
    elif basket_type == BasketType.INDEX:
        companies = get_companies_for_index_basket(
            db, index_name=index_name, index_id=index_id
        )
    elif basket_type == BasketType.PORTFOLIO:
        if portfolio_id is None:
            raise ValueError("portfolio_id is required for portfolio baskets")
        companies = get_companies_for_portfolio_basket(db, portfolio_id)
    else:
        raise ValueError(f"Unsupported basket type: {basket_type}")

    if not companies:
        return {"status": "ok", "message": "No companies in basket", "updated": 0}

    # 2. Group by market – this is where yfinance needs the market context
    tickers_by_market = _group_tickers_by_market(companies)

    updated_count = 0

    # 3. Call your existing batch loaders per market
    for market_name, tickers in tickers_by_market.items():
        if refresh_prices:
            fetch_and_save_stock_price_history_data_batch(
                tickers=tickers,
                market_name=market_name,
                db=db,
                start_date=None,
                end_date=None,
                force_update=False,
            )
        if refresh_fundamentals:
            update_financials_for_tickers(
                db=db,
                tickers=tickers,
                market_name=market_name,
            )

        updated_count += len(tickers)

    return {
        "status": "ok",
        "message": f"Refreshed basket {basket_type} with {updated_count} tickers",
        "updated": updated_count,
    }
