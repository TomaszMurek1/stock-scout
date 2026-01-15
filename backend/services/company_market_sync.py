"""Utilities for syncing companies to their markets using Yahoo Finance."""

from __future__ import annotations

import logging
import os
import requests
from typing import Dict, Optional

import yfinance as yf
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from database.company import Company
from database.market import Market
from services.ticker_discovery_service import fetch_tickers_by_market

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
    "AMS": "XAMS",  # Amsterdam
    "GER": "XETR",  # Xetra (Germany)
    "DE": "XETR",
    "XETR": "XETR",
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



def _detect_fmp_exchange(ticker: str) -> Optional[str]:
    """Fallback using Financial Modeling Prep if yfinance fails."""
    api_key = os.getenv("FMP_API_KEY")
    if not api_key:
        log.warning("FMP_API_KEY not found, skipping FMP fallback for %s", ticker)
        return None

    try:
        url = f"https://financialmodelingprep.com/stable/profile?symbol={ticker}&apikey={api_key}"
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200:
            return None
        
        data = resp.json()
        if not data or not isinstance(data, list):
            return None
            
        profile = data[0]
        exchange = profile.get("exchange")
        if exchange:
            return str(exchange).upper()
            
    except Exception as e:
        log.warning("FMP fallback failed for %s: %s", ticker, e)
        
    return None

def _detect_yahoo_exchange(ticker: str) -> Optional[str]:
    ticker_obj = yf.Ticker(ticker)

    def _is_not_found(exc: Exception) -> bool:
        s = str(exc).lower()
        return "not found" in s or "404" in s or "delisted" in s

    try:
        fast_info = getattr(ticker_obj, "fast_info", None) or {}
        exchange = fast_info.get("exchange") or fast_info.get("exchangeCode")
        if exchange:
            return str(exchange).upper()
    except Exception as exc:  # noqa: BLE001
        if _is_not_found(exc):
            return "DELISTED"
        # If it's a rate limit or other error, we continue to next method
        log.warning("Failed to read fast_info for %s: %s", ticker, exc)

    try:
        info = ticker_obj.info
        exchange = info.get("exchange") or info.get("exchangeTimezoneShortName")
        if exchange:
            return str(exchange).upper()
    except Exception as exc:  # noqa: BLE001
        if _is_not_found(exc):
            return "DELISTED"
        log.warning("Failed to read info for %s: %s", ticker, exc)

    # Try FMP Fallback before giving up
    fmp_exchange = _detect_fmp_exchange(ticker)
    if fmp_exchange:
        log.info(f"FMP Fallback: Found exchange {fmp_exchange} for {ticker}")
        return fmp_exchange

    if _looks_delisted(ticker_obj):
        return "DELISTED"

    return None


def add_companies_for_market(db: Session, market_code: str) -> dict:
    """
    Add companies by fetching all tickers for a given market using yfinance Screener,
    then adding them via yfinance logic.
    """
    try:
        tickers = fetch_tickers_by_market(market_code)
        if not tickers:
            return {
                "summary": {"added": 0, "existing": 0, "failed": 0, "total": 0},
                "details": [],
                "message": f"No tickers found for market {market_code}. Possible API plan restriction or invalid exchange."
            }
        
        return add_companies_via_yfinance(db, tickers)
        
    except Exception as e:
        log.error(f"Error adding companies for market {market_code}: {e}")
        return {
            "summary": {"added": 0, "existing": 0, "failed": 0, "total": 0},
            "details": [],
            "message": f"Failed to fetch tickers: {str(e)}"
        }


def add_companies_via_yfinance(db: Session, tickers: list[str]) -> dict:
    """
    Add new companies to the database by fetching metadata from yfinance.
    If the company already exists, it is skipped.
    """
    added = 0
    existing = 0
    failed = 0
    results = []

    for ticker_raw in tickers:
        ticker = ticker_raw.strip().upper()
        if not ticker:
            continue

        # Check if exists
        if db.query(Company).filter(Company.ticker == ticker).first():
            existing += 1
            results.append({"ticker": ticker, "status": "exists", "message": "Already in DB"})
            continue

        # Fetch info
        try:
            yf_ticker = yf.Ticker(ticker)
            info = yf_ticker.info
            isin = getattr(yf_ticker, "isin", None)
            
            # If info is empty or doesn't look right, might be invalid ticker
            if not info or (not info.get("longName") and not info.get("shortName")):
                # Some tickers might validly have little info, but usually name is there.
                # Fallback to using ticker as name if completely missing, 
                # but prefer to check if it actually exists.
                pass

            # Check for duplicate ISIN if we have one
            if isin:
                existing_isin = db.query(Company).filter(Company.isin == isin).first()
                if existing_isin:
                    existing += 1
                    results.append({
                        "ticker": ticker, 
                        "status": "skipped", 
                        "message": f"Duplicate ISIN {isin} (exists as {existing_isin.ticker})"
                    })
                    continue

            name = info.get("longName") or info.get("shortName") or ticker
            
            company = Company(
                name=name,
                ticker=ticker,
                isin=isin,
                sector=info.get("sector"),
                industry=info.get("industry")
            )
            db.add(company)
            db.commit()
            db.refresh(company)

            # Try to sync market immediately
            exchange = _detect_yahoo_exchange(ticker)
            if exchange and exchange != "DELISTED":
                mapped = YAHOO_TO_EXCHANGE.get(exchange, exchange)
                company.yfinance_market = mapped
                market = _lookup_market(db, mapped)
                if market:
                    company.market_id = market.market_id
                db.commit()

            added += 1
            results.append({"ticker": ticker, "status": "added", "name": name})

        except Exception as e:
            log.error(f"Failed to add {ticker}: {e}")
            db.rollback()
            failed += 1
            results.append({"ticker": ticker, "status": "error", "message": str(e)})

    return {
        "summary": {
            "added": added,
            "existing": existing,
            "failed": failed,
            "total": len(tickers)
        },
        "details": results
    }


def get_available_markets() -> Dict[str, str]:
    """Return the list of supported markets (Yahoo exchange code -> Market code)."""
    return YAHOO_TO_EXCHANGE


def sync_company_markets(
    db: Session,
    *,
    force: bool = False,
    limit: Optional[int] = None,
    start_from_id: Optional[int] = None,
) -> dict:
    """Assign markets to companies using Yahoo exchange metadata."""

    query = db.query(Company)
    if not force:
        # If not force, we want to process companies that are missing EITHER market OR isin OR yfinance_market
        # AND are not already marked as DELISTED (to avoid repeated checking)
        query = query.filter(
            and_(
                or_(
                    Company.market_id == None, 
                    Company.isin == None,
                    Company.yfinance_market == None
                ),
                or_(Company.yfinance_market == None, Company.yfinance_market != "DELISTED")
            )
        )  # noqa: E711
    
    if start_from_id is not None:
        query = query.filter(Company.company_id > start_from_id)

    query = query.order_by(Company.company_id)
            
    if limit:
        query = query.limit(limit)

    companies = query.all()
    processed = len(companies)
    last_id = companies[-1].company_id if companies else (start_from_id or 0)

    if processed == 0:
        return {
            "processed": 0,
            "updated": 0,
            "skipped": 0,
            "metadata_only": 0,
            "missing_exchange": [],
            "missing_market": [],
            "delisted": [],
            "last_id": last_id
        }

    updated = 0
    skipped = 0
    metadata_only = 0
    missing_exchange: list[str] = []
    missing_market: list[str] = []
    delisted: list[str] = []

    for company in companies:
        current_updated = False
        
        # 1. Check ISIN
        if not company.isin or force:
            try:
                # Using yf.Ticker().isin property
                t_obj = yf.Ticker(company.ticker)
                fetched_isin = getattr(t_obj, "isin", None)
                if fetched_isin and fetched_isin != company.isin:
                    company.isin = fetched_isin
                    current_updated = True
            except Exception as e:
                if "404" in str(e) or "Not Found" in str(e):
                     # Might be delisted, let market check handle it or mark here?
                     # Let's wait for market check to confirm delisting
                     pass
                else:
                    log.warning(f"Failed to fetch ISIN for {company.ticker}: {e}")

        # 2. Check Market
        if not company.market_id or force:
            if not force and company.yfinance_market == "DELISTED":
                skipped += 1
                if current_updated: updated += 1
                continue

            exchange = _detect_yahoo_exchange(company.ticker)
            if not exchange:
                missing_exchange.append(company.ticker)
                skipped += 1
                if current_updated: updated += 1
                continue

            if exchange == "DELISTED":
                if company.yfinance_market != "DELISTED":
                    company.yfinance_market = "DELISTED"
                    metadata_only += 1
                delisted.append(company.ticker)
                # Even if delisted, we might have updated ISIN
                if current_updated: updated += 1
                continue

            mapped_code = YAHOO_TO_EXCHANGE.get(exchange, exchange)
            market = _lookup_market(db, mapped_code)
            
            if company.yfinance_market != mapped_code:
                company.yfinance_market = mapped_code
                current_updated = True # Updated metadata

            if not market:
                missing_market.append(f"{company.ticker}:{exchange}")
                metadata_only += 1
                if current_updated: updated += 1
                continue

            if company.market_id != market.market_id:
                company.market_id = market.market_id
                current_updated = True

        if current_updated:
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
        "last_id": last_id
    }