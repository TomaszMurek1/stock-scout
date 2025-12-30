from datetime import datetime, timedelta
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from services.auth.auth import get_current_user
from schemas.stock_schemas import BreakoutRequest
from database.base import get_db
from database.user import User
from database.company import Company
from database.stock_data import StockPriceHistory
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from api.golden_cross import resolve_universe
from services.company_filter_service import filter_by_market_cap

router = APIRouter()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def _chunked(seq, size):
    """Yield successive size-chunks from seq."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]

def detect_consolidation(prices: list[StockPriceHistory], consolidation_period: int, threshold_pct: float):
    # Sort prices by date ascending just in case
    prices.sort(key=lambda x: x.date)
    
    if len(prices) < consolidation_period:
        return None  # Not enough data

    # Consider the last N days (consolidation window)
    window = prices[-consolidation_period:]
    
    highs = [p.high for p in window if p.high is not None]
    lows = [p.low for p in window if p.low is not None]
    
    if not highs or not lows:
        return None
        
    range_high = max(highs)
    range_low = min(lows)
    
    if range_low == 0:
        return None

    # Calculate range percentage variation
    # (High - Low) / Low
    range_pct = ((range_high - range_low) / range_low) * 100.0
    
    if range_pct > threshold_pct:
        return None # Range too wide, not a tight consolidation

    return {
        "range_high": range_high,
        "range_low": range_low,
        "range_pct": range_pct,
        "current_price": window[-1].close,
        "current_volume": window[-1].volume
    }


@router.post("/breakout")
def scan_consolidation(
    request: BreakoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scans for stocks trading in a tight consolidation range.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    
    if not request.basket_ids:
         raise HTTPException(
            status_code=400, detail="Select at least one basket."
        )

    start_time = time.time()
    results = []

    # 1. Resolve Universe
    market_ids, companies = resolve_universe(db, None, request.basket_ids)
    
    if not companies:
        return {"status": "success", "data": []}

    # 2. Filter by Market Cap
    if request.min_market_cap:
        companies = filter_by_market_cap(db, companies, request.min_market_cap)
        if not companies:
            return {"status": "success", "data": []}

    # 3. Fetch/Ensure Data
    # Lookback: consolidation_period + buffer
    lookback_days = request.consolidation_period + 10 
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=lookback_days * 2) 
    
    tickers_by_market = {}
    
    for comp in companies:
        if comp.market:
            tickers_by_market.setdefault(comp.market.name, []).append(comp.ticker)

    BATCH_SIZE = 50
    for market_name, tickers in tickers_by_market.items():
        for chunk in _chunked(tickers, BATCH_SIZE):
            fetch_and_save_stock_price_history_data_batch(
                tickers=chunk,
                market_name=market_name,
                db=db,
                start_date=start_date,
                end_date=today,
                force_update=False,
            )

    # 4. Analyze
    for comp in companies:
        prices = (
            db.query(StockPriceHistory)
            .filter(StockPriceHistory.company_id == comp.company_id)
            .filter(StockPriceHistory.date >= start_date)
            .order_by(StockPriceHistory.date.asc())
            .all()
        )
        
        consolidation_data = detect_consolidation(
            prices, 
            request.consolidation_period, 
            request.threshold_percentage
        )
        
        if consolidation_data:
            results.append({
                "ticker": comp.ticker,
                "name": comp.name,
                "current_price": consolidation_data["current_price"],
                "range_high": consolidation_data["range_high"],
                "range_low": consolidation_data["range_low"],
                "range_pct": consolidation_data["range_pct"],
                "volume": consolidation_data["current_volume"],
                "date": prices[-1].date.strftime("%Y-%m-%d") if prices else str(today)
            })

    elapsed = time.time() - start_time
    logger.info(f"Consolidation scan processed {len(companies)} companies in {elapsed:.2f}s. Found {len(results)} matches.")
    
    return {"status": "success", "data": results}
