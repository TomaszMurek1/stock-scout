import logging
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    current_user: User = Depends(get_current_user)
):
    """
    This endpoint checks for a "golden cross" using the AnalysisResult cache
    and returns the SAME JSON structure as the old code did.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )


    if not request.markets:
        raise HTTPException(status_code=400, detail="No markets specified in the request.")

    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted

    start_time = time.time()
    golden_cross_results = []  # We'll store results in the old "ticker, data" style

    # 1) Get Market IDs
    market_ids = [
        m[0] for m in db.query(Market.market_id)
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
        raise HTTPException(status_code=404, detail="No companies found for these markets.")

    logger.info(f"Found {len(companies)} companies to analyze in {request.markets}.")

    # 3) For each (company, market), use the caching logic
    cross_type = "golden"  # Hard-coded to 'golden' cross; adapt if needed
    for company in companies[:10]:
        
        for market in company.markets:
            if market.market_id not in market_ids:
                continue  # skip irrelevant markets
            
            print(f"Analyzing golden-cross for {company.ticker}...")
            # Ensure fresh data before analysis
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
                stale_after_days=1  # or whatever logic
            )

            # If analysis_record.cross_date is present, it means there was a cross
            # But we also check days_since_cross <= days_to_look_back
            if (analysis_record 
                and analysis_record.cross_date 
                and analysis_record.days_since_cross is not None
                and analysis_record.days_since_cross <= days_to_look_back
            ):
                # Convert it to your OLD structure: 
                #   { "ticker": <company.ticker>, "data": { ... } }
                this_result = {
                    "ticker": company.ticker,
                    "data": {
                        "ticker": company.ticker,
                        "name": company.name,
                        "date": analysis_record.cross_date.strftime("%Y-%m-%d"),
                        "days_since_cross": analysis_record.days_since_cross,
                        "close": analysis_record.cross_price,
                        "short_ma": short_window,  # If you want actual values, you'd recalc or store them
                        "long_ma": long_window,
                    }
                }
                golden_cross_results.append(this_result)

    processing_time = time.time() - start_time
    logger.info(
        f"Processed golden cross check for {len(companies)} companies in {processing_time:.2f}s"
    )

    # 4) If we found no crosses => handle same as old code
    if not golden_cross_results:
        # If your old code returned 404 in this case:
        raise HTTPException(status_code=404, detail="No golden crosses found for any companies.")

    # 5) Return old structure
    return {"status": "success", "data": golden_cross_results}
