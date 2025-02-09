from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from schemas.stock_schemas import GoldenCrossRequest
from services.technical_analysis_service import find_most_recent_golden_cross
from database.models import Company, Market
import time
from sqlalchemy import select

router = APIRouter()

@router.post("/golden-cross")
async def get_companies_with_golden_cross(request: GoldenCrossRequest, db: Session = Depends(get_db)):
    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted
    markets = request.markets

    start_time = time.time()

    # Fetch all companies for the given markets
    companies = db.query(Company.ticker, Market.name.label("market_name")).join(Market).filter(
        Market.name.in_(markets)
    ).all()

    if not companies:
        raise HTTPException(status_code=404, detail="No companies found for the selected markets.")

    golden_cross_results = []
    for company in companies[:100]:  # Limit to avoid excessive processing
        ticker = company.ticker
        market = company.market_name

        result = find_most_recent_golden_cross(
            ticker=ticker,
            market=market,
            short_window=short_window,
            long_window=long_window,
            min_volume=min_volume,
            adjusted=adjusted,
            max_days_since_cross=days_to_look_back,
            db=db
        )

        if result:
            golden_cross_results.append({"ticker": ticker, "data": result})

    processing_time = time.time() - start_time
    print(f"Processing time: {processing_time:.2f}s")

    if golden_cross_results:
        return {"status": "success", "data": golden_cross_results}
    
    raise HTTPException(status_code=404, detail="No golden crosses found for any companies.")
