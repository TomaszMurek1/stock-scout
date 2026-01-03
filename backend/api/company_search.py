import logging
from typing import Optional

import requests
import yfinance as yf
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.base import get_db
from database.company import Company
from services.company_market_sync import (
    YAHOO_TO_EXCHANGE,
    _detect_yahoo_exchange,
    _lookup_market,
)


router = APIRouter()
logger = logging.getLogger(__name__)


def _market_payload(exchange_code: str | None, db: Session) -> dict:
    if not exchange_code:
        return {"market_id": None, "name": ""}
    mapped = YAHOO_TO_EXCHANGE.get(exchange_code.upper(), exchange_code.upper())
    market = _lookup_market(db, mapped)
    if market:
        return {"market_id": market.market_id, "name": market.name}
    return {"market_id": None, "name": mapped}


def _direct_lookup(ticker: str, db: Session) -> dict | None:
    ticker = ticker.strip().upper()
    if not ticker:
        return None
    try:
        ticker_obj = yf.Ticker(ticker)
        fast_info = getattr(ticker_obj, "fast_info", {}) or {}
        info = getattr(ticker_obj, "info", {}) or {}

        quote_type = fast_info.get("quoteType") or info.get("quoteType")
        if quote_type and str(quote_type).upper() == "OPTION":
            return None

        name = (
            info.get("shortName")
            or info.get("longName")
            or info.get("longname")
            or ticker
        )
        exchange_code = _detect_yahoo_exchange(ticker)
        market = _market_payload(exchange_code, db)
        return {
            "company_id": None,
            "name": name,
            "ticker": ticker,
            "market": market,
            "source": "external",
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("YFinance direct lookup failed for %s: %s", ticker, exc)
        return None


def _sync_company_id_sequence(db: Session) -> None:
    """Ensure the companies PK sequence is at least max(company_id)."""
    try:
        db.execute(
            text(
                "SELECT setval(pg_get_serial_sequence('companies','company_id'), "
                "COALESCE((SELECT MAX(company_id) FROM companies), 0))"
            )
        )
        db.flush()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to sync companies sequence: %s", exc)
        db.rollback()


def _persist_external_results(results: list[dict], db: Session) -> None:
    _sync_company_id_sequence(db)
    created_any = False
    for item in results:
        ticker = item.get("ticker")
        if not ticker:
            continue

        existing = db.query(Company).filter(Company.ticker == ticker).first()
        if existing:
            item["company_id"] = existing.company_id
            if existing.market:
                item["market"] = {
                    "market_id": existing.market.market_id,
                    "name": existing.market.name,
                }
            continue

        try:
            exchange_code = None
            try:
                exchange_code = _detect_yahoo_exchange(ticker)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Exchange detection failed for %s: %s", ticker, exc)
            mapped_code = (
                YAHOO_TO_EXCHANGE.get(exchange_code.upper(), exchange_code.upper())
                if exchange_code
                else None
            )
            market_obj = _lookup_market(db, mapped_code) if mapped_code else None

            company = Company(
                name=item.get("name") or ticker,
                ticker=ticker,
                sector=None,
                industry=None,
                yfinance_market=mapped_code,
                market_id=market_obj.market_id if market_obj else None,
            )
            db.add(company)
            db.flush()
            item["company_id"] = company.company_id
            if market_obj:
                item["market"] = {
                    "market_id": market_obj.market_id,
                    "name": market_obj.name,
                }
            elif mapped_code and not item.get("market"):
                item["market"] = {"market_id": None, "name": mapped_code}
            created_any = True
        except IntegrityError as exc:  # noqa: BLE001
            db.rollback()
            logger.warning("Race creating company %s: %s", ticker, exc)
            existing = db.query(Company).filter(Company.ticker == ticker).first()
            if existing:
                item["company_id"] = existing.company_id
                if existing.market:
                    item["market"] = {
                        "market_id": existing.market.market_id,
                        "name": existing.market.name,
                    }
    if created_any:
        db.commit()


def _search_yfinance(search: str, limit: int, db: Session) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    headers = {"User-Agent": "Mozilla/5.0"}
    url = "https://query2.finance.yahoo.com/v1/finance/search"
    params = {
        "q": search,
        "quotesCount": limit,
        "newsCount": 0,
        "quotesQueryId": "tss_match_phrase_query",
    }

    # If the query looks like a ticker, try to resolve it directly first
    raw_ticker = search.strip().upper()
    looks_like_ticker = raw_ticker and (" " not in raw_ticker) and len(raw_ticker) <= 10
    if looks_like_ticker:
        direct = _direct_lookup(raw_ticker, db)
        if direct:
            results.append(direct)
            seen.add(direct["ticker"])

    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json() or {}
        quotes = data.get("quotes") or []
        for quote in quotes:
            symbol = quote.get("symbol")
            if not symbol or symbol in seen:
                continue
            quote_type = (quote.get("typeDisp") or quote.get("quoteType") or "").upper()
            if quote_type == "OPTION":
                continue
            exchange = (
                quote.get("exchDisp")
                or quote.get("exchangeDisplay")
                or quote.get("exchange")
                or ""
            )
            name = (
                quote.get("shortname")
                or quote.get("longname")
                or quote.get("name")
                or symbol
            )
            results.append(
                {
                    "company_id": None,
                    "name": name,
                    "ticker": symbol,
                    "market": _market_payload(exchange, db),
                    "source": "external",
                }
            )
            seen.add(symbol)
            if len(results) >= limit:
                break
    except Exception as exc:  # noqa: BLE001
        logger.warning("YFinance search failed for %s: %s", search, exc)

    return results


@router.get("")
def search_companies(
    search: Optional[str] = Query(None, description="Search by name or ticker"),
    market_id: Optional[int] = Query(None, description="Market ID"),
    db: Session = Depends(get_db),
    limit: int = 15,
    include_external: bool = Query(
        False, description="Search yfinance for additional tickers"
    ),
):
    query = db.query(Company)
    raw_search = search
    if market_id:
        query = query.filter(Company.market_id == market_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Company.name.ilike(pattern)) | (Company.ticker.ilike(pattern))
        )
    companies = query.limit(limit).all()
    results = []
    for c in companies:
        # Get currency from market if available
        currency = None
        if c.market and c.market.currency:
            currency = c.market.currency
        
        results.append({
            "company_id": c.company_id,
            "name": c.name,
            "ticker": c.ticker,
            "market": (
                {"market_id": c.market.market_id, "name": c.market.name}
                if c.market
                else None
            ),
            "source": "db",
            "currency": currency,
        })

    if include_external and raw_search:
        tickers = {c["ticker"] for c in results}
        external = [
            item
            for item in _search_yfinance(raw_search, limit, db)
            if item["ticker"] not in tickers
        ]
        if external:
            # _persist_external_results(external, db)
            pass
        results.extend(external)
    return results
