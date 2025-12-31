from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database.base import get_db
from services.auth.auth import get_current_user
from services.company_filter_service import filter_by_market_cap
from database.user import User
from services.basket_resolver import resolve_baskets_to_companies
from services.yfinance_data_update.data_update_service import fetch_and_save_stock_price_history_data_batch
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class PriceHistoryRequest(BaseModel):
    """Request schema for populating historical price data."""
    basket_ids: List[int] = Field(description="Basket IDs to fetch price data for")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format (default: 365 days ago)")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format (default: today)")
    force_update: bool = Field(default=False, description="Force re-fetch even if data exists")
    min_market_cap: Optional[float] = Field(None, ge=0, description="Minimum market cap in millions USD")


def _chunked(seq, size):
    """Yield successive size-chunks from seq."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


@router.post("/populate-price-history")
def populate_price_history(
    request: PriceHistoryRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),  # Admin check handled by frontend routing
):
    """
    Populate historical price data for companies in selected baskets.
    Admin-only endpoint (protected by frontend routing).
    """
    
    if not request.basket_ids:
        raise HTTPException(status_code=400, detail="At least one basket must be selected")
    
    # Parse dates
    today = datetime.utcnow().date()
    
    if request.end_date:
        try:
            end_date = datetime.strptime(request.end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")
    else:
        end_date = today
    
    if request.start_date:
        try:
            start_date = datetime.strptime(request.start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    else:
        # Default to 365 days ago
        start_date = today - timedelta(days=365)
    
    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
    
    # Resolve baskets to companies
    try:
        market_ids, companies = resolve_baskets_to_companies(db, request.basket_ids)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    if not companies:
        return {
            "status": "success",
            "message": "No companies found in selected baskets",
            "companies_processed": 0,
            "results": []
        }
    
    # Filter by market cap if requested
    if request.min_market_cap:
        companies = filter_by_market_cap(db, companies, request.min_market_cap)
        if not companies:
            return {
                "status": "success",
                "message": f"No companies found above {request.min_market_cap}M USD market cap",
                "companies_processed": 0,
                "results": []
            }
    
    # Group companies by market
    companies_by_market = {}
    for comp in companies:
        market_name = comp.market.name if comp.market else "Unknown"
        companies_by_market.setdefault(market_name, []).append(comp)
    
    # Fetch price data in batches per market
    results = []
    total_processed = 0
    
    for market_name, comps in companies_by_market.items():
        tickers = [c.ticker for c in comps]
        total_processed += len(tickers)
        
        logger.info(f"Fetching price history for {len(tickers)} companies in {market_name}")
        
        for chunk in _chunked(tickers, 50):
            try:
                resp = fetch_and_save_stock_price_history_data_batch(
                    tickers=chunk,
                    market_name=market_name,
                    db=db,
                    start_date=start_date,
                    end_date=end_date,
                    force_update=request.force_update,
                )
                
                results.append({
                    "market": market_name,
                    "tickers": chunk,
                    "count": len(chunk),
                    "status": "success"
                })
                
                logger.info(f"Batch completed for {market_name}: {len(chunk)} tickers")
                
            except Exception as e:
                logger.error(f"Error fetching data for {market_name} batch: {str(e)}")
                results.append({
                    "market": market_name,
                    "tickers": chunk,
                    "count": len(chunk),
                    "status": "error",
                    "error": str(e)
                })
    
    return {
        "status": "success",
        "message": f"Processed {total_processed} companies across {len(companies_by_market)} markets",
        "companies_processed": total_processed,
        "date_range": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        },
        "results": results
    }
