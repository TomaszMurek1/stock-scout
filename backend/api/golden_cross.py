from datetime import datetime, timedelta
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from services.auth.auth import get_current_user
from database.analysis import AnalysisResult
from schemas.stock_schemas import GoldenCrossRequest
from database.base import get_db
from database.user import User
from database.market import Market
from database.company import Company, company_stockindex_association
from database.stock_data import CompanyMarketData
from services.analysis_results.analysis_results import get_or_update_analysis_result
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from services.basket_resolver import resolve_baskets_to_companies
from services.company_filter_service import filter_by_market_cap
from services.scan_job_service import create_job, run_scan_task

router = APIRouter()
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _chunked(seq, size):
    """Yield successive size-chunks from seq."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def get_markets_and_companies(db, market_names):
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


def resolve_universe(db: Session, market_names: list[str] | None, basket_ids: list[int] | None):
    market_ids = set()
    company_map = {}

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

    # Ensure market IDs also include values from resolved companies (in case baskets lacked mid info)
    for comp in company_map.values():
        if comp.market and comp.market.market_id:
            market_ids.add(comp.market.market_id)

    if not market_ids:
        return [], []

    return list(market_ids), list(company_map.values())


def _resolve_baskets_or_404(db: Session, basket_ids: list[int]):
    if not basket_ids:
        return set(), []
    try:
        return resolve_baskets_to_companies(db, basket_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc



def load_existing_golden_cross_analysis(
    db, market_ids, companies, short_window, long_window
):
    existing = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.analysis_type == "golden_cross")
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .filter(AnalysisResult.market_id.in_(market_ids))
        .filter(AnalysisResult.company_id.in_([c.company_id for c in companies]))
        .all()
    )
    analysis_map = {(r.company_id, r.market_id): r for r in existing}
    return analysis_map


def filter_pairs_needing_update(
    companies,
    market_ids,
    analysis_map,
    now,
    days_to_look_back,
    short_window,
    long_window,
    golden_cross_results,
):
    pairs_to_check = []
    for comp in companies:
        mkt = comp.market
        if not mkt or mkt.market_id not in market_ids:
            continue
        rec = analysis_map.get((comp.company_id, mkt.market_id))
        if (
            rec
            and rec.cross_date
            and (now - rec.cross_date).days <= days_to_look_back
            and rec.days_since_cross is not None
            and rec.days_since_cross <= days_to_look_back
        ):
            golden_cross_results.append(
                {
                    "ticker": comp.ticker,
                    "data": {
                        "ticker": comp.ticker,
                        "name": comp.name,
                        "date": rec.cross_date.strftime("%Y-%m-%d"),
                        "days_since_cross": rec.days_since_cross,
                        "close": rec.cross_price,
                        "short_ma": short_window,
                        "long_ma": long_window,
                    },
                }
            )
            continue
        if (
            rec
            and not rec.cross_date
            and rec.last_updated
            and rec.last_updated.date() == now
        ):
            continue
        pairs_to_check.append((comp, mkt))
    return pairs_to_check


def fetch_price_history_for_pairs(
    db, pairs_to_check, short_window, long_window, days_to_look_back
):
    today = datetime.utcnow().date()
    lookback_days = long_window + days_to_look_back + 5
    start_date = today - timedelta(days=lookback_days)
    end_date = today
    tickers_by_market = {}
    for comp, mkt in pairs_to_check:
        tickers_by_market.setdefault(mkt.name, []).append(comp.ticker)
    BATCH_SIZE = 50
    for market_name, tickers in tickers_by_market.items():
        logger.info(f"Preparing batches for market: {market_name}, tickers: {tickers}")
        for chunk in _chunked(tickers, BATCH_SIZE):
            resp = fetch_and_save_stock_price_history_data_batch(
                tickers=chunk,
                market_name=market_name,
                db=db,
                start_date=start_date,
                end_date=end_date,
                force_update=False,
            )
            logger.info(f"Batch fetch [{market_name}] {chunk[:5]}…: {resp}")


def analyze_and_build_results(
    db,
    pairs_to_check,
    cross_type,
    short_window,
    long_window,
    days_to_look_back,
    min_volume,
    adjusted,
    golden_cross_results,
):
    for comp, mkt in pairs_to_check:
        analysis_record = get_or_update_analysis_result(
            db=db,
            company=comp,
            market=mkt,
            cross_type=cross_type,
            short_window=short_window,
            long_window=long_window,
            days_to_look_back=days_to_look_back,
            min_volume=min_volume,
            adjusted=adjusted,
            stale_after_days=1,
        )
        if (
            analysis_record
            and analysis_record.cross_date
            and analysis_record.days_since_cross is not None
            and analysis_record.days_since_cross <= days_to_look_back
        ):
            golden_cross_results.append(
                {
                    "ticker": comp.ticker,
                    "data": {
                        "ticker": comp.ticker,
                        "name": comp.name,
                        "date": analysis_record.cross_date.strftime("%Y-%m-%d"),
                        "days_since_cross": analysis_record.days_since_cross,
                        "close": analysis_record.cross_price,
                        "short_ma": short_window,
                        "long_ma": long_window,
                    },
                }
            )

def run_golden_cross_scan(
    db: Session,
    request: GoldenCrossRequest
):
    """
    Sync function to be run in background.
    """
    # ... (Copied logic) ...
    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted

    start_time = time.time()
    golden_cross_results = []

    # 1) Get all matching markets & companies
    market_ids, companies = resolve_universe(db, request.markets, request.basket_ids)
    if not companies:
        return {"status": "success", "data": []}

    # 1.5) Filter by Market Cap if requested
    if request.min_market_cap:
        companies = filter_by_market_cap(db, companies, request.min_market_cap)
        if not companies:
             logger.info("No companies left after market cap filter.")
             return {"status": "success", "data": []}

    # 2) Preload existing analysis so we only re-analyze stale/missing
    analysis_map = load_existing_golden_cross_analysis(
        db, market_ids, companies, short_window, long_window
    )
    logger.info(
        f"companies_to_check: {len(companies)} "
        f"companies_to_check (first 10): {[(comp.ticker) for comp in companies[:10]]}"
    )
    now = datetime.utcnow().date()
    # 3) Build list of (company,market) needing fresh analysis
    pairs_to_check = filter_pairs_needing_update(
        companies,
        market_ids,
        analysis_map,
        now,
        days_to_look_back,
        short_window,
        long_window,
        golden_cross_results,
    )

    logger.info(
        f"pairs_to_check: {len(pairs_to_check)} "
        f"pairs (first 10): "
        f"{[(comp.ticker, mkt.name) for comp, mkt in pairs_to_check[:10]]}"
    )

    if pairs_to_check:
        # 4) Batch‐fetch price history for all needed tickers, chunked
        fetch_price_history_for_pairs(
            db, pairs_to_check, short_window, long_window, days_to_look_back
        )

    # 5) Run your existing analysis on each pair
    analyze_and_build_results(
        db,
        pairs_to_check,
        cross_type="golden",
        short_window=short_window,
        long_window=long_window,
        days_to_look_back=days_to_look_back,
        min_volume=min_volume,
        adjusted=adjusted,
        golden_cross_results=golden_cross_results,
    )

    elapsed = time.time() - start_time
    logger.info(
        f"Golden‐cross checked {len(companies)} companies "
        f"({len(pairs_to_check)} fresh) in {elapsed:.2f}s"
    )

    if not golden_cross_results:
        return {"status": "success", "data": []}
    golden_cross_results.sort(key=lambda x: x["ticker"])
    return {"status": "success", "data": golden_cross_results}


@router.post("/golden-cross")
def start_golden_cross_scan(
    request: GoldenCrossRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a background job for Golden Cross scan.
    Returns: { "job_id": "uuid", "status": "PENDING" }
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    if not request.markets and not request.basket_ids:
        raise HTTPException(
            status_code=400, detail="Select at least one market or basket."
        )

    # Create Job record
    job = create_job(db, "golden_cross")

    # Define task wrapper
    def task_wrapper(db_session: Session):
        return run_golden_cross_scan(db_session, request)

    # Enqueue background task
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)

    return {"job_id": job.id, "status": "PENDING"}
