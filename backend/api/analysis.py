from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from schemas.stock_schemas import GoldenCrossRequest
from services.technical_analysis_service import find_most_recent_golden_cross
from database.models import Company, Market, company_market_association
import time
from sqlalchemy import select

router = APIRouter()

@router.post("/golden-cross")
async def get_companies_with_golden_cross(
    request: GoldenCrossRequest,
    db: Session = Depends(get_db)
):
    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted
    markets = request.markets

    start_time = time.time()
    numberOfCompanies = 10

    if not markets:
        raise HTTPException(status_code=400, detail="No markets specified in the request.")

    # Step 1: Get Market IDs from Names
    market_ids = [
        market_id for (market_id,) in db.query(Market.market_id)
        .filter(Market.name.in_(markets))
        .all()
    ]

    print(f"✅ DEBUG: Market IDs for {markets}: {market_ids}")

    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found.")
    
    all_companies = (
        db.query(Company)
        .join(company_market_association)
        .join(Market)
        .filter(Market.market_id.in_(market_ids))
        .limit(numberOfCompanies)
        .all()
    )

    print(f"✅ DEBUG: Found companies: {[company.name for company in all_companies]}")

    if not all_companies:
        raise HTTPException(status_code=404, detail="No companies found for the selected markets.")

    golden_cross_results = []

    for company in all_companies[:numberOfCompanies]:
        company_markets = {market.name for market in company.markets}
    
        # Only check markets this company belongs to
        for market_name in markets:
            if market_name not in company_markets:
                continue  # Skip irrelevant markets
            
            result = find_most_recent_golden_cross(
                ticker=company.ticker,
                market=market_name,
                short_window=short_window,
                long_window=long_window,
                min_volume=min_volume,
                adjusted=adjusted,
                max_days_since_cross=days_to_look_back,
                db=db
            )
            if result:
                golden_cross_results.append({"ticker": company.ticker, "data": result})

    processing_time = time.time() - start_time
    print(f"Processing time: {processing_time:.2f}s")

    if golden_cross_results:
        return {"status": "success", "data": golden_cross_results}
    raise HTTPException(status_code=404, detail="No golden crosses found for any companies.")
