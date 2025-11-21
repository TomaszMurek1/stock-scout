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


def _looks_delisted(ticker_obj: yf.Ticker) -> bool:
    try:
        hist = ticker_obj.history(period="5d")
        if hist.empty:
            return True
    except Exception as exc:  # noqa: BLE001
        if "delisted" in str(exc).lower():
            return True
    return False


def _detect_yahoo_exchange(ticker: str) -> Optional[str]:
    ticker_obj = yf.Ticker(ticker)

    def _maybe_delisted(exc: Exception) -> bool:
        return "delisted" in str(exc).lower()

    try:
        fast_info = getattr(ticker_obj, "fast_info", None) or {}
        exchange = fast_info.get("exchange") or fast_info.get("exchangeCode")
        if exchange:
            return str(exchange).upper()
    except Exception as exc:  # noqa: BLE001
        if _maybe_delisted(exc):
            return "DELISTED"
        log.warning("Failed to read fast_info for %s: %s", ticker, exc)

    try:
        info = ticker_obj.info
        exchange = info.get("exchange") or info.get("exchangeTimezoneShortName")
        if exchange:
            return str(exchange).upper()
    except Exception as exc:  # noqa: BLE001
        if _maybe_delisted(exc):
            return "DELISTED"
        log.warning("Failed to read info for %s: %s", ticker, exc)

    if _looks_delisted(ticker_obj):
        return "DELISTED"

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
        query = query.filter(Company.market_id == None)  # noqa: E711
        query = query.filter(Company.yfinance_market == None)  # noqa: E711

            
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
            "delisted": [],
        }

    updated = 0
    skipped = 0
    metadata_only = 0
    missing_exchange: list[str] = []
    missing_market: list[str] = []
    delisted: list[str] = []

    for company in companies:
        if not force and company.yfinance_market == "DELISTED":
            skipped += 1
            continue

        exchange = _detect_yahoo_exchange(company.ticker)
        if not exchange:
            missing_exchange.append(company.ticker)
            skipped += 1
            continue

        if exchange == "DELISTED":
            company.yfinance_market = "DELISTED"
            metadata_only += 1
            delisted.append(company.ticker)
            continue

        mapped_code = YAHOO_TO_EXCHANGE.get(exchange, exchange)
        market = _lookup_market(db, mapped_code)
        company.yfinance_market = mapped_code

        if not market:
            missing_market.append(f"{company.ticker}:{exchange}")
            metadata_only += 1
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
        "delisted": delisted,
    }
