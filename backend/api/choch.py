from datetime import datetime, timedelta
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User
from schemas.choch_schemas import ChochRequest
from api.golden_cross import resolve_universe, filter_by_market_cap, _chunked
from services.yfinance_data_update.data_update_service import fetch_and_save_stock_price_history_data_batch
from database.stock_data import StockPriceHistory
from database.company import Company

router = APIRouter()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def find_local_highs_lows(df, window=5):
    """
    Find local highs and lows using a rolling window.
    """
    df['max_local'] = df['Close'].rolling(window=window*2+1, center=True).max()
    df['min_local'] = df['Close'].rolling(window=window*2+1, center=True).min()
    
    df['is_high'] = df['Close'] == df['max_local']
    df['is_low'] = df['Close'] == df['min_local']
    
    return df

def identify_choch_pattern(df, lookback_period=10):
    """
    Identify Bearish to Bullish Change of Character (CHoCH).
    Pattern: Downtrend (Lower Highs, Lower Lows) -> Break above most recent significant Lower High.
    """
    # Simply finding peaks/troughs
    # We can use a simpler approach for "significant" points: 
    # use the rolling window defined by lookback_period as sensitivity.
    
    df = find_local_highs_lows(df, window=lookback_period)
    
    highs = df[df['is_high']].copy()
    lows = df[df['is_low']].copy()
    
    if len(highs) < 2 or len(lows) < 2:
        return False, None
    
    # recent_highs = highs.tail(3)
    # recent_lows = lows.tail(3)
    
    # Logic for Downtrend: The highs are descending.
    # We look for the LAST CONFIRMED Lower High.
    
    # Let's take the last few peaks.
    # If we are in a downtrend, High[-2] > High[-1] (Lower High).
    # CHoCH happens when the *current* price breaks above High[-1].
    # But High[-1] must be a "Lower High" relative to High[-2].
    
    # We need to check if the CURRENT price (latest close) has broken above the last detected local high,
    # AND that last detected local high was part of a downtrend structure.
    
    last_high_idx = highs.index[-1]
    last_high_price = highs.iloc[-1]['Close']
    
    # Check if we have a previous high
    if len(highs) < 2:
        return False, None
        
    prev_high_idx = highs.index[-2]
    prev_high_price = highs.iloc[-2]['Close']
    
    # Check for downtrend structure (Lower Highs)
    # At least the last two highs should be descending
    if not (last_high_price < prev_high_price):
        return False, None
    
    # Check if current price (latest available in df) broke above local high
    latest_price = df.iloc[-1]['Close']
    latest_date = df.index[-1]
    
    # If the last local high was sufficiently recent (don't want to break a high from 2 years ago)
    # And we broke it.
    
    # Also, we usually want to see that we made a Lower Low before breaking the high?
    # Bearish to Bullish: LH, LL -> then break LH.
    
    last_low_idx = lows.index[-1]
    last_low_price = lows.iloc[-1]['Close']
    
    # Was the last low a Lower Low?
    if len(lows) >= 2:
        prev_low_idx = lows.index[-2]
        prev_low_price = lows.iloc[-2]['Close']
        if not (last_low_price < prev_low_price):
            pass # Relax this for now, strict definition might miss recent turns
            
    # CHoCH condition: Break above the last Lower High
    if latest_price > last_high_price:
        # Detected
        return True, {
            "break_price": latest_price, 
            "last_lh_price": last_high_price, 
            "last_lh_date": last_high_idx
        }
        
    return False, None

@router.post("/choch")
def scan_choch(
    request: ChochRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if not request.markets and not request.basket_ids:

        raise HTTPException(status_code=400, detail="Select at least one market or basket.")
        
    start_time = time.time()
    results = []
    
    # 1. Resolve Universe
    market_ids, companies = resolve_universe(db, request.markets, request.basket_ids)
    
    # 2. Filter by Market Cap
    if request.min_market_cap:
        companies = filter_by_market_cap(db, companies, request.min_market_cap)

    if not companies:
        return {"status": "success", "data": []}
        
    # 3. Update Data (Batch Fetch)
    # We need enough data to detect patterns. 365 days should be safely enough for local highs/lows.
    lookback_days = 365 
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=lookback_days)
    
    # We group by market to batch fetch
    companies_by_market = {}
    for c in companies:
        m_name = c.market.name if c.market else "Unknown"
        companies_by_market.setdefault(m_name, []).append(c)
        
    for m_name, comps in companies_by_market.items():
        tickers = [c.ticker for c in comps]
        for chunk in _chunked(tickers, 50):
             fetch_and_save_stock_price_history_data_batch(
                tickers=chunk,
                market_name=m_name,
                db=db,
                start_date=start_date,
                end_date=today,
                force_update=False
            )
            
    # 4. Analyze
    # Load data from DB
    
    comp_ids = [c.company_id for c in companies]
    
    # We can fetch all history for these companies in one go or per company.
    # Given memory, maybe per company or batches.
    
    # Fetching all might be heavy if list is huge.
    # Let's simple loop and query DB.
    
    for comp in companies:
        hist = db.query(StockPriceHistory).filter(
            StockPriceHistory.company_id == comp.company_id,
            StockPriceHistory.date >= start_date
        ).order_by(StockPriceHistory.date.asc()).all()
        
        if not hist or len(hist) < 30:
            continue
            
        # Convert to DataFrame
        data = [{
            "Date": h.date,
            "Close": h.close,
            "High": h.high,
            "Low": h.low,
            "Open": h.open,
            "Volume": h.volume
        } for h in hist]
        
        df = pd.DataFrame(data)
        df.set_index('Date', inplace=True)
        
        is_choch, details = identify_choch_pattern(df, lookback_period=request.lookback_period)
        
        if is_choch:
            results.append({
                "ticker": comp.ticker,
                "name": comp.name,
                "price": details['break_price'],
                "broken_level": details['last_lh_price'],
                "level_date": details['last_lh_date'].strftime("%Y-%m-%d"),
                "date": df.index[-1].strftime("%Y-%m-%d")
            })
            
    elapsed = time.time() - start_time
    logger.info(f"CHoCH scan finished in {elapsed:.2f}s. Found {len(results)} matches.")
    
    return {"status": "success", "data": results}
