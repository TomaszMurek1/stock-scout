from datetime import datetime
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
from services.yfinance_data_update.data_update_service import ensure_fresh_data
from .security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


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

    # 1) Get Market IDs
    market_ids = [
        m[0]
        for m in db.query(Market.market_id)
        .filter(Market.name.in_(request.markets))
        .all()
    ]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found.")

    # 2) Find all companies in those markets
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

    logger.info(f"Found {len(companies)} companies to analyze in {request.markets}.")

    # 3) Preload relevant AnalysisResult records
    company_ids = [c.company_id for c in companies]
    existing_results = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.analysis_type == "golden_cross")
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .filter(AnalysisResult.market_id.in_(market_ids))
        .filter(AnalysisResult.company_id.in_(company_ids))
        .all()
    )

    now = datetime.utcnow().date()
    analysis_map = {(res.company_id, res.market_id): res for res in existing_results}

    # 4) Determine which company/market pairs need fresh analysis
    company_market_pairs_to_check = []
    for company in companies:
        for market in company.markets:
            if market.market_id not in market_ids:
                continue

            key = (company.company_id, market.market_id)
            existing = analysis_map.get(key)

            if existing:
                if (
                    existing.cross_date
                    and (now - existing.cross_date).days <= 30
                    and existing.days_since_cross is not None
                    and existing.days_since_cross <= days_to_look_back
                ):
                    # ✅ Add immediately to results
                    golden_cross_results.append(
                        {
                            "ticker": company.ticker,
                            "data": {
                                "ticker": company.ticker,
                                "name": company.name,
                                "date": existing.cross_date.strftime("%Y-%m-%d"),
                                "days_since_cross": existing.days_since_cross,
                                "close": existing.cross_price,
                                "short_ma": short_window,
                                "long_ma": long_window,
                            },
                        }
                    )
                    continue

                elif (
                    not existing.cross_date
                    and existing.last_updated
                    and existing.last_updated.date() == now
                ):
                    # ❌ Already checked today with no cross
                    continue

            # Otherwise → needs fresh analysis
            company_market_pairs_to_check.append((company, market))

    # 5) Analyze only the required pairs
    cross_type = "golden"
    for company, market in company_market_pairs_to_check:
        print(f"Analyzing golden-cross for {company.ticker}...")
        ensure_fresh_data(company.ticker, market.name, db)

        analysis_record = get_or_update_analysis_result(
            db=db,
            company=company,
            market=market,
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
            this_result = {
                "ticker": company.ticker,
                "data": {
                    "ticker": company.ticker,
                    "name": company.name,
                    "date": analysis_record.cross_date.strftime("%Y-%m-%d"),
                    "days_since_cross": analysis_record.days_since_cross,
                    "close": analysis_record.cross_price,
                    "short_ma": short_window,
                    "long_ma": long_window,
                },
            }
            golden_cross_results.append(this_result)

    processing_time = time.time() - start_time
    logger.info(
        f"Processed golden cross check for {len(companies)} companies "
        f"({len(company_market_pairs_to_check)} analyzed) in {processing_time:.2f}s"
    )

    if not golden_cross_results:
        raise HTTPException(
            status_code=404, detail="No golden crosses found for any companies."
        )
    golden_cross_results.sort(key=lambda x: x["ticker"])
    return {"status": "success", "data": golden_cross_results}
