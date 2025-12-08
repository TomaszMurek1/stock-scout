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
from database.analysis import AnalysisResult
from services.analysis_results.analysis_results import get_or_update_analysis_result # Import helper if needed, or implement direct logic

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
    
    # CRITICAL FIX: User's 'lookback_period' is often large (30, 60, 200) for scanning context.
    # It should NOT be used as the window for defining what a "Swing High" or "Swing Low" is.
    # A Swing High/Low is a local fractal, usually defined by 3-5 bars on either side.
    # If we use window=30, we miss many obvious structure points.
    
    SWING_WINDOW = 5 # Fixed small window for local extrema
    
    df = find_local_highs_lows(df, window=SWING_WINDOW)
    
    highs = df[df['is_high']].copy()
    lows = df[df['is_low']].copy()
    
    # Needs at least 2 lows to confirm downtrend
    if len(lows) < 2:
        return False, None

    # Strict Definition:
    # 1. Identify the most recent Low (Last Low)
    # 2. Identify the Previous Low
    # 3. CONFIRMATION: Last Low < Previous Low (Downtrend continuation)
    # 4. Find the High that occurred strictly BETWEEN these two lows (Intervening High)
    # 5. SIGNAL: Current Price > Intervening High
    
    last_low_idx = lows.index[-1]
    last_low_price = lows.iloc[-1]['Close']
    
    prev_low_idx = lows.index[-2]
    prev_low_price = lows.iloc[-2]['Close']
    
    # Condition 1: Lower Low
    if not (last_low_price < prev_low_price):
        return False, None
        
    # Condition 2: Find Intervening High
    # Slice highs between prev_low_idx and last_low_idx
    # We use timestamps. 
    
    intervening_highs = highs.loc[prev_low_idx : last_low_idx]
    # Note: loc includes boundaries. The high strictly between should probably be used.
    # But usually a Swing High forms between Swing Lows.
    # If multiple, take the highest? Or the most recent?
    # Standard Market Structure: The LH responsible for the LL. usually the highest point between.
    
    if intervening_highs.empty:
        return False, None
        
    # Exclude the start/end if they happen to be exactly on the low dates (unlikely but possible if high=low on a doji?)
    # Safest is to take the max high in that period.
    
    # We need the price and the date
    target_high_price = intervening_highs['Close'].max()
    # Find the date of that max
    target_high_idx = intervening_highs[intervening_highs['Close'] == target_high_price].index[-1] # Take last if duplicates
    
    # Check if current price (latest available) broke above this target high
    latest_price = df.iloc[-1]['Close']
    latest_date = df.index[-1] 
    
    if latest_price > target_high_price:
        return True, {
            "break_price": latest_price, 
            "last_lh_price": target_high_price, 
            "last_lh_date": target_high_idx,
            "last_ll_price": last_low_price,
            "last_ll_date": last_low_idx,
            "date": latest_date.strftime("%Y-%m-%d")
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

    # --- Caching Optimization Start ---
    # Load existing results for "choch", with same windows
    # Window mapping: short=lookback, long=days_to_check
    
    analysis_type = "choch"
    
    existing_results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.market_id.in_(market_ids)) # Rough filter by markets
        .filter(AnalysisResult.company_id.in_([c.company_id for c in companies]))
        .filter(AnalysisResult.analysis_type == analysis_type)
        .filter(AnalysisResult.short_window == request.lookback_period)
        .filter(AnalysisResult.long_window == request.days_to_check)
        .all()
    )
    
    existing_map = {r.company_id: r for r in existing_results}
    
    companies_to_fetch = []
    companies_to_analyze = []
    today = datetime.utcnow().date()
    
    for comp in companies:
        cached = existing_map.get(comp.company_id)
        is_fresh = False
        is_negative = False
        
        if cached:
            if cached.last_updated and cached.last_updated.date() == today:
                 is_fresh = True
                 if cached.cross_date is None:
                     is_negative = True
        
        if is_fresh:
            if not is_negative:
                # Fresh Positive: Skip Fetch, But Analyze (to get details)
                companies_to_analyze.append(comp)
            # Fresh Negative: Skip Both
        else:
            # Stale or No Cache: Fetch AND Analyze
            companies_to_fetch.append(comp)
            companies_to_analyze.append(comp)
        
    logger.info(f"CHoCH Optimization: Total {len(companies)} -> Fetch {len(companies_to_fetch)} -> Analyze {len(companies_to_analyze)}")
            
    if not companies_to_analyze:
        return {"status": "success", "data": []}
    
    # 3. Update Data (Batch Fetch) for needed companies only
    # We need enough data to detect patterns. 365 days should be safely enough for local highs/lows.
    lookback_days = 365 
    start_date = today - timedelta(days=lookback_days)
    
    # We group by market to batch fetch
    companies_by_market = {}
    for c in companies_to_fetch:
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
            
    # 4. Analyze & Update Cache
    
    for comp in companies_to_analyze:
        hist = db.query(StockPriceHistory).filter(
            StockPriceHistory.company_id == comp.company_id,
            StockPriceHistory.date >= start_date
        ).order_by(StockPriceHistory.date.asc()).all()
        
        is_choch = False
        details = None
        
        if hist and len(hist) >= 30:
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
        
        # Save Result to DB
        cached = existing_map.get(comp.company_id)
        if not cached:
            cached = AnalysisResult(
                company_id=comp.company_id,
                market_id=comp.market.market_id,
                analysis_type=analysis_type,
                short_window=request.lookback_period,
                long_window=request.days_to_check
            )
            db.add(cached)
            
        cached.last_updated = datetime.utcnow()
        if is_choch:
            # cached.cross_date should be the date of the event (breakout)
            cached.cross_date = datetime.strptime(details['date'], "%Y-%m-%d").date()
            
            cached.cross_price = float(details['break_price'])
            # We can put days since pattern in days_since_cross
            cached.days_since_cross = int((today - cached.cross_date).days)
            
            # Prepare chart data
            # Ensure we cover the LL and LH dates.
            # Find the earliest date relevant to the pattern.
            p_dates = []
            
            # Helper to normalize dates
            def normalize_date(d):
                if isinstance(d, str):
                    return datetime.strptime(d, "%Y-%m-%d").date()
                elif hasattr(d, 'date'):
                    return d.date()
                return d
                
            p_dates.append(normalize_date(details['date']))
            if 'last_ll_date' in details:
                p_dates.append(normalize_date(details['last_ll_date']))
            if 'last_lh_date' in details:
                p_dates.append(normalize_date(details['last_lh_date']))
            
            # Now all are date objects
            earliest_dt = sorted(p_dates)[0]
            
            # Calculate days to slice
            # We want to show:
            # 1. The pattern context (LL, LH, Break)
            # 2. The "Scan Range" start (requested by user)
            
            scan_limit_date = today - timedelta(days=request.days_to_check)
            
            # Ensure type safety for comparison (earliest_dt is already date object)
            
            # Cutoff is the earlier of:
            # - Pattern Start - 45 days (context)
            # - Scan Start Date (so we can visualize the vertical line)
            
            cutoff_date = min(earliest_dt - timedelta(days=15), scan_limit_date)
            
            chart_hist = [h for h in hist if h.date >= cutoff_date]
            
            chart_data = [{
                "date": h.date.strftime("%Y-%m-%d"),
                "close": h.close,
                "high": h.high
            } for h in chart_hist]

            results.append({
                "ticker": comp.ticker,
                "name": comp.name,
                "price": details['break_price'],
                "broken_level": details['last_lh_price'],
                "level_date": details['last_lh_date'].strftime("%Y-%m-%d"),
                "lowest_low": details['last_ll_price'],
                "lowest_low_date": details['last_ll_date'].strftime("%Y-%m-%d"),
                "date": details['date'],
                "scan_start_date": scan_limit_date.strftime("%Y-%m-%d"),
                "chart_data": chart_data
            })
        else:
            cached.cross_date = None
            cached.cross_price = None
            cached.days_since_cross = None
            
    db.commit()
            
    elapsed = time.time() - start_time
    logger.info(f"CHoCH scan finished in {elapsed:.2f}s. Found {len(results)} matches.")
    
    return {"status": "success", "data": results}
