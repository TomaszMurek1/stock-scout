from datetime import datetime, timedelta
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import pandas as pd

from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User
from schemas.wyckoff_schemas import WyckoffRequest, WyckoffResult, WyckoffScore
from api.golden_cross import resolve_universe, _chunked
from services.company_filter_service import filter_by_market_cap
from services.yfinance_data_update.data_update_service import fetch_and_save_stock_price_history_data_batch
from database.stock_data import StockPriceHistory
from database.company import Company
from database.analysis import AnalysisResult
from services.technical_analysis.wyckoff_analysis import analyze_wyckoff_accumulation
from services.scan_job_service import create_job, run_scan_task

router = APIRouter()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def run_wyckoff_scan(db: Session, request: WyckoffRequest):
    """
    Sync function to be run in background.
    """
    start_time = time.time()
    results = []
    
    # 1. Resolve Universe
    market_ids, companies = resolve_universe(db, request.markets, request.basket_ids)
    
    # 2. Filter by Market Cap
    if request.min_market_cap:
        companies = filter_by_market_cap(db, companies, request.min_market_cap)

    if not companies:
        return {"status": "success", "data": []}

    # --- Caching Optimization ---
    analysis_type = "wyckoff"
    
    existing_results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.market_id.in_(market_ids))
        .filter(AnalysisResult.company_id.in_([c.company_id for c in companies]))
        .filter(AnalysisResult.analysis_type == analysis_type)
        .filter(AnalysisResult.long_window == request.lookback_days)
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
                # cross_price stores overall_score for wyckoff
                if cached.cross_price is not None and cached.cross_price >= request.min_score:
                    # Fresh positive: analyze (to get full details)
                    companies_to_analyze.append(comp)
                else:
                    # Fresh negative (below threshold): skip
                    is_negative = True
        
        if not is_fresh:
            # Stale or no cache: fetch and analyze
            companies_to_fetch.append(comp)
            companies_to_analyze.append(comp)
        
    logger.info(f"Wyckoff Optimization: Total {len(companies)} -> Fetch {len(companies_to_fetch)} -> Analyze {len(companies_to_analyze)}")
            
    if not companies_to_analyze:
        return {"status": "success", "data": []}
    
    # 3. Batch fetch price data
    # We need sufficient data for pattern analysis
    lookback_days = max(request.lookback_days + 30, 120)  # Extra buffer for calculations
    start_date = today - timedelta(days=lookback_days)
    
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
        # Query ALL available historical data (not limited by start_date)
        # This allows chart generation to use the full lookback period requested
        hist = db.query(StockPriceHistory).filter(
            StockPriceHistory.company_id == comp.company_id
        ).order_by(StockPriceHistory.date.asc()).all()
        
        if not hist or len(hist) < 20:
            # Not enough data, update cache to prevent re-fetching
            cached = existing_map.get(comp.company_id)
            if not cached:
                cached = AnalysisResult(
                    company_id=comp.company_id,
                    market_id=comp.market.market_id,
                    analysis_type=analysis_type,
                    long_window=request.lookback_days
                )
                db.add(cached)
            cached.last_updated = datetime.utcnow()
            cached.cross_price = 0.0  # Score of 0
            cached.cross_date = None
            continue
        
        # Convert to DataFrame
        data = [{
            "Date": h.date,
            "Open": h.open,
            "High": h.high,
            "Low": h.low,
            "Close": h.close,
            "Volume": h.volume
        } for h in hist]
        
        df = pd.DataFrame(data)
        df.set_index('Date', inplace=True)
        
        # Run Wyckoff analysis
        # Convert weights to dict if provided
        weights_dict = None
        if request.weights:
            # Validate that weights sum to 100
            total = (
                request.weights.trading_range +
                request.weights.volume_pattern +
                request.weights.spring +
                request.weights.support_tests +
                request.weights.signs_of_strength
            )
            if abs(total - 100.0) > 0.1:  # Allow small floating point error
                raise HTTPException(
                    status_code=400,
                    detail=f"Weights must sum to 100%, got {total:.1f}%"
                )
            weights_dict = {
                "trading_range": request.weights.trading_range / 100,
                "volume_pattern": request.weights.volume_pattern / 100,
                "spring": request.weights.spring / 100,
                "support_tests": request.weights.support_tests / 100,
                "signs_of_strength": request.weights.signs_of_strength / 100,
            }
        
        analysis = analyze_wyckoff_accumulation(df, lookback_days=request.lookback_days, weights=weights_dict)
        
        overall_score = analysis.get("overall_score", 0.0)
        
        # Update cache
        cached = existing_map.get(comp.company_id)
        if not cached:
            cached = AnalysisResult(
                company_id=comp.company_id,
                market_id=comp.market.market_id,
                analysis_type=analysis_type,
                long_window=request.lookback_days
            )
            db.add(cached)
            
        cached.last_updated = datetime.utcnow()
        cached.cross_price = float(overall_score)  # Convert to Python float before storing
        
        # Only add to results if above threshold
        if overall_score >= request.min_score:
            # Prepare chart data showing the full lookback period
            chart_start = today - timedelta(days=min(request.lookback_days, len(hist)))
            chart_hist = [h for h in hist if h.date >= chart_start]
            
            logger.info(f"Chart data for {comp.ticker}: requested {request.lookback_days} days, hist has {len(hist)} days, chart has {len(chart_hist)} days from {chart_start}")
            
            chart_data = [{
                "date": h.date.strftime("%Y-%m-%d"),
                "open": float(h.open),
                "high": float(h.high),
                "low": float(h.low),
                "close": float(h.close),
                "volume": int(h.volume) if h.volume else 0
            } for h in chart_hist]
            
            # Convert scores to WyckoffScore format
            scores = [
                WyckoffScore(
                    criterion=s["criterion"],
                    score=s["score"],
                    narrative=s["narrative"]
                )
                for s in analysis.get("scores", [])
            ]
            
            result = WyckoffResult(
                ticker=comp.ticker,
                name=comp.name,
                overall_score=float(overall_score),
                scores=scores,
                current_price=float(hist[-1].close),
                range_low=float(analysis.get("range_low")) if analysis.get("range_low") is not None else None,
                range_high=float(analysis.get("range_high")) if analysis.get("range_high") is not None else None,
                phase_detected=analysis.get("phase_detected"),
                chart_data=chart_data
            )
            
            results.append(result.dict())
            
    db.commit()
    
    # Sort by overall score descending
    results.sort(key=lambda x: x["overall_score"], reverse=True)
            
    elapsed = time.time() - start_time
    logger.info(f"Wyckoff scan finished in {elapsed:.2f}s. Found {len(results)} matches above {request.min_score}% threshold.")
    
    return {"status": "success", "data": results}


@router.post("/wyckoff")
def scan_wyckoff_accumulation(
    request: WyckoffRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scan for Wyckoff accumulation patterns using scoring + narrative approach.
    
    Detects observable price/volume patterns without claiming to understand institutional intent.
    Returns stocks with overall score >= min_score threshold.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    if not request.markets and not request.basket_ids:
        raise HTTPException(status_code=400, detail="Select at least one market or basket.")
        
    job = create_job(db, "wyckoff")

    def task_wrapper(db_session: Session):
        return run_wyckoff_scan(db_session, request)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)

    return {"job_id": job.id, "status": "PENDING"}
