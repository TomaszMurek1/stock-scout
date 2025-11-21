from __future__ import annotations

import logging
from typing import List, Set, Tuple

from sqlalchemy.orm import Session

from database.baskets import Basket, BasketCompany, BasketType
from database.company import Company, company_stockindex_association

log = logging.getLogger(__name__)


def _query_pairs_for_basket(db: Session, basket: Basket) -> List[Tuple[int | None, int | None]]:
    if basket.type == BasketType.MARKET and basket.reference_id is not None:
        return (
            db.query(Company.company_id, Company.market_id)
            .filter(Company.market_id == basket.reference_id)
            .all()
        )
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
