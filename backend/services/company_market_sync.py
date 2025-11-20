"""Utilities for syncing companies to their markets using Yahoo Finance."""

from __future__ import annotations

import logging
from typing import Dict, Optional

import yfinance as yf
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.company import Company
from database.market import Market

log = logging.getLogger(__name__)


# Mapping between Yahoo "exchange" strings and our Markets.exchange_code/mic_code
YAHOO_TO_EXCHANGE: Dict[str, str] = {
    "NMS": "XNAS",  # NASDAQ
    "NAS": "XNAS",
    "NASDAQ": "XNAS",
    "NCM": "XNAS",
    "NYQ": "XNYS",  # NYSE
    "NYSE": "XNYS",
    "ASE": "XASE",  # NYSE American
    "ARC": "XARCA",
    "PCX": "XARCA",
    "PAR": "XPAR",
    "LSE": "XLON",
    "LSEG": "XLON",
    "LON": "XLON",
    "TWO": "ROCO",
    "TAI": "XTAI",
    "WSE": "XWAR",
    "WAR": "XWAR",
    "ICE": "XICE",
    "STO": "XSTO",
}


def _lookup_market(db: Session, exchange_code: str | None) -> Optional[Market]:
    if not exchange_code:
        return None
    return (
        db.query(Market)
        .filter(
            or_(
                Market.exchange_code == exchange_code,
                Market.mic_code == exchange_code,
            )
        )
        .first()
    )


def _detect_yahoo_exchange(ticker: str) -> Optional[str]:
    try:
        ticker_obj = yf.Ticker(ticker)
        fast_info = getattr(ticker_obj, "fast_info", None) or {}
        exchange = fast_info.get("exchange") or fast_info.get("exchangeCode")
        if exchange:
            return str(exchange).upper()
        # fallback to full info – slower but more reliable
        info = ticker_obj.info
        exchange = info.get("exchange") or info.get("exchangeTimezoneShortName")
        return str(exchange).upper() if exchange else None
    except Exception as exc:  # noqa: BLE001
        log.warning("Failed to fetch exchange for %s: %s", ticker, exc)
        return None


def sync_company_markets(
    db: Session,
    *,
    force: bool = False,
    limit: Optional[int] = None,
) -> dict:
    """Assign markets to companies using Yahoo exchange metadata."""

    query = db.query(Company)
    if not force:
        query = query = query.filter((Company.market_id == None) & (Company.yfinance_market == None)) # noqa: E711
    if limit:
        query = query.limit(limit)

    companies = query.all()
    processed = len(companies)
    if processed == 0:
        return {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "missing_exchange": [],
            "missing_market": [],
        }

    updated = 0
    skipped = 0
    metadata_only = 0
    missing_exchange: list[str] = []
    missing_market: list[str] = []

    for company in companies:
        exchange = _detect_yahoo_exchange(company.ticker)
        if not exchange:
            missing_exchange.append(company.ticker)
            skipped += 1
            continue

        mapped_code = YAHOO_TO_EXCHANGE.get(exchange, exchange)
        market = _lookup_market(db, mapped_code)
        company.yfinance_market = mapped_code

        if not market:
            missing_market.append(f"{company.ticker}:{exchange}")
            metadata_only += 1
            skipped += 1
            continue

        if company.market_id != market.market_id or force:
            company.market_id = market.market_id
            updated += 1

    if updated or metadata_only:
        db.commit()

    return {
        "processed": processed,
        "updated": updated,
        "skipped": skipped,
        "metadata_only": metadata_only,
        "missing_exchange": missing_exchange,
        "missing_market": missing_market,
    }
