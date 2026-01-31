from __future__ import annotations

import logging
from typing import List, Set, Tuple

from sqlalchemy.orm import Session

from database.baskets import Basket, BasketCompany, BasketType
from database.company import Company, company_stockindex_association

log = logging.getLogger(__name__)


def _query_pairs_for_basket(db: Session, basket: Basket) -> List[Tuple[int | None, int | None]]:
    # Scenario A: Smart Basket with Rules
    if basket.rules:
        # Initial set of company/market IDs
        results: Set[Tuple[int | None, int | None]] = set()

        # 1. Market Rules: {"market_codes": ["XNYS", "XNAS"]}
        if "market_codes" in basket.rules:
            codes = basket.rules["market_codes"]
            market_results = (
                db.query(Company.company_id, Company.market_id)
                .filter(Company.yfinance_market.in_(codes))
                .all()
            )
            results.update(market_results)

        # 2. Force Include: {"include_symbols": ["AAPL", "TL0.DE"]}
        if "include_symbols" in basket.rules:
            inc_tickers = basket.rules["include_symbols"]
            inc_results = (
                db.query(Company.company_id, Company.market_id)
                .filter(Company.ticker.in_(inc_tickers))
                .all()
            )
            results.update(inc_results)

        # 3. Force Exclude: {"exclude_symbols": ["TL0.DE"]}
        if "exclude_symbols" in basket.rules:
            exc_tickers = basket.rules["exclude_symbols"]
            exc_ids = {row[0] for row in db.query(Company.company_id).filter(Company.ticker.in_(exc_tickers)).all()}
            results = {r for r in results if r[0] not in exc_ids}

        return list(results)

    # Scenario B: Legacy Market Reference
    if basket.type == BasketType.MARKET and basket.reference_id is not None:
        return (
            db.query(Company.company_id, Company.market_id)
            .filter(Company.market_id == basket.reference_id)
            .all()
        )
    
    # Scenario C: Legacy Index Reference
    if basket.type == BasketType.INDEX and basket.reference_id is not None:
        return (
            db.query(Company.company_id, Company.market_id)
            .join(
                company_stockindex_association,
                company_stockindex_association.c.company_id == Company.company_id,
            )
            .filter(company_stockindex_association.c.index_id == basket.reference_id)
            .all()
        )
        
    # Scenario D: Static Custom Basket
    return (
        db.query(Company.company_id, Company.market_id)
        .join(BasketCompany, BasketCompany.company_id == Company.company_id)
        .filter(BasketCompany.basket_id == basket.id)
        .all()
    )


def resolve_baskets_to_companies(db: Session, basket_ids: List[int]) -> Tuple[Set[int], List[Company]]:
    if not basket_ids:
        return set(), []

    baskets = db.query(Basket).filter(Basket.id.in_(basket_ids)).all()
    found_ids = {b.id for b in baskets}
    missing = set(basket_ids) - found_ids
    if missing:
        raise ValueError(f"Unknown basket IDs: {', '.join(str(b) for b in sorted(missing))}")

    company_ids: Set[int] = set()
    market_ids: Set[int] = set()

    for basket in baskets:
        log.info("Processing basket %s (%s)", basket.id, basket.type)
        rows = _query_pairs_for_basket(db, basket)
        log.info("Basket %s returned %d pairs", basket.id, len(rows))
        for company_id, market_id in rows:
            if company_id is None:
                continue
            company_ids.add(company_id)
            if market_id is not None:
                market_ids.add(market_id)

    if not company_ids:
        return market_ids, []

    companies = (
        db.query(Company)
        .filter(Company.company_id.in_(company_ids))
        .all()
    )
    log.info(
        "Baskets %s resolved to %d companies and %d markets",
        basket_ids,
        len(companies),
        len(market_ids),
    )
    return market_ids, companies
