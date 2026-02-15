"""Shared helpers for resolving the stock universe for scan operations.

Extracted from golden_cross.py / death_cross.py to eliminate duplication.
"""
import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session

from database.company import Company
from database.market import Market
from services.basket_resolver import resolve_baskets_to_companies

logger = logging.getLogger(__name__)


def get_markets_and_companies(db: Session, market_names: list[str]):
    """Look up markets by name and return their IDs + associated companies."""
    markets = db.query(Market).filter(Market.name.in_(market_names)).all()
    market_ids = [m.market_id for m in markets]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found.")
    companies = db.query(Company).filter(Company.market_id.in_(market_ids)).all()
    if not companies:
        raise HTTPException(
            status_code=404, detail="No companies found for these markets."
        )
    return market_ids, companies


def _resolve_baskets_or_404(db: Session, basket_ids: list[int]):
    if not basket_ids:
        return set(), []
    try:
        return resolve_baskets_to_companies(db, basket_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def resolve_universe(
    db: Session,
    market_names: list[str] | None,
    basket_ids: list[int] | None,
):
    """Resolve a combined set of markets + baskets into (market_ids, companies)."""
    market_ids: set[int] = set()
    company_map: dict[int, Company] = {}

    if market_names:
        mids, comps = get_markets_and_companies(db, market_names)
        market_ids.update(mids)
        for comp in comps:
            company_map[comp.company_id] = comp

    if basket_ids:
        basket_market_ids, basket_companies = _resolve_baskets_or_404(db, basket_ids)
        market_ids.update(basket_market_ids)
        for comp in basket_companies:
            company_map[comp.company_id] = comp

    if not company_map:
        return market_ids, []

    for comp in company_map.values():
        if comp.market and comp.market.market_id:
            market_ids.add(comp.market.market_id)

    if not market_ids:
        return [], []

    return list(market_ids), list(company_map.values())
