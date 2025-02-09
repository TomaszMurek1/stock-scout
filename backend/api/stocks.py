from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from schemas.stock_schemas import TickerRequest
from services.stock_data_service import fetch_and_save_stock_data
from datetime import datetime, timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/fetch-stock-data")
async def fetch_stock_data(request: TickerRequest, db: Session = Depends(get_db)):
    tickers = request.tickers
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    results = []
    for ticker in tickers:
        try:
            result = fetch_and_save_stock_data(ticker, start_date, end_date, db)
            results.append({"ticker": ticker, "message": result["message"], "status": result["status"]})
        except Exception as e:
            logger.error(f"Error fetching {ticker}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error processing {ticker}")

    return {"results": results}
