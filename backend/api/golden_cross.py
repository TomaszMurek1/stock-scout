from datetime import datetime, timedelta
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.analysis import AnalysisResult
from schemas.stock_schemas import GoldenCrossRequest
from database.base import get_db
from database.user import User
from database.market import Market
from database.company import Company, company_market_association
from services.analysis_results.analysis_results import get_or_update_analysis_result
from services.yfinance_data_update.data_update_service import (
    fetch_and_save_stock_price_history_data_batch,
)
from .security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


def _chunked(seq, size):
    """Yield successive size-chunks from seq."""
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


@router.post("/golden-cross")
def cached_golden_cross(
    request: GoldenCrossRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    This endpoint checks for a "golden cross" using the AnalysisResult cache
    and returns the SAME JSON structure as the old code did.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )

    if not request.markets:
        raise HTTPException(
            status_code=400, detail="No markets specified in the request."
        )

    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted

    start_time = time.time()
    golden_cross_results = []

    # 1) Get all matching markets & companies
    market_ids = [
        m[0]
        for m in db.query(Market.market_id)
        .filter(Market.name.in_(request.markets))
        .all()
    ]
    if not market_ids:
        raise HTTPException(
            status_code=404, detail="No matching markets found."
        )  # :contentReference[oaicite:0]{index=0}

    companies = (
        db.query(Company)
        .join(company_market_association)
        .join(Market)
        .filter(Market.market_id.in_(market_ids))
        .all()
    )
    if not companies:
        raise HTTPException(
            status_code=404, detail="No companies found for these markets."
        )
    # 2) Preload existing analysis so we only re-analyze stale/missing
    existing = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.analysis_type == "golden_cross")
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .filter(AnalysisResult.market_id.in_(market_ids))
        .filter(AnalysisResult.company_id.in_([c.company_id for c in companies]))
        .all()
    )
    now = datetime.utcnow().date()
    analysis_map = {(r.company_id, r.market_id): r for r in existing}

    # 3) Build list of (company,market) needing fresh analysis
    pairs_to_check = []
    for comp in companies:
        for mkt in comp.markets:
            if mkt.market_id not in market_ids:
                continue
            rec = analysis_map.get((comp.company_id, mkt.market_id))
            if (
                rec
                and rec.cross_date
                and (now - rec.cross_date).days <= 30
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
            # otherwise need to fetch & analyze
            pairs_to_check.append((comp, mkt))

    if pairs_to_check:
        # 4) Batch‐fetch price history for all needed tickers, chunked
        today = now
        # we need at least long_window + days_to_look_back days of history + buffer
        lookback_days = long_window + days_to_look_back + 5
        start_date = today - timedelta(days=lookback_days)
        end_date = today

        # group tickers by market
        tickers_by_market: dict[str, list[str]] = {}
        for comp, mkt in pairs_to_check:
            tickers_by_market.setdefault(mkt.name, []).append(comp.ticker)

        BATCH_SIZE = 50
        for market_name, tickers in tickers_by_market.items():
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

    # 5) Run your existing analysis on each pair
    cross_type = "golden"
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

    elapsed = time.time() - start_time
    logger.info(
        f"Golden‐cross checked {len(companies)} companies "
        f"({len(pairs_to_check)} fresh) in {elapsed:.2f}s"
    )

    if not golden_cross_results:
        raise HTTPException(
            status_code=404, detail="No golden crosses found for any companies."
        )
    golden_cross_results.sort(key=lambda x: x["ticker"])
    return {"status": "success", "data": golden_cross_results}
