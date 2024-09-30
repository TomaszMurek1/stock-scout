from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.database.database import Base, engine, get_db
from backend.auth import router as auth_router
from backend.services.stock_data_service import fetch_and_save_stock_data
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from sqlalchemy import select
from backend.services.technical_analysis_service import find_most_recent_golden_cross
from backend.database.models import Company  # Make sure to import the Company model

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:3000",  # React frontend
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Include authentication routes
app.include_router(auth_router, prefix="/auth")

# Example protected route
@app.get("/")
async def root():
    return {"message": "Welcome to the Stock Scout API!"}

# Add this router to your main FastAPI app
router = APIRouter()

class TickerRequest(BaseModel):
    tickers: List[str]

class GoldenCrossRequest(BaseModel):
    short_window: int = 50
    long_window: int = 200
    days_to_look_back: int = 90  # New parameter
    min_volume: int = 1000000
    adjusted: bool = True

@router.post("/fetch-stock-data")
async def fetch_stock_data(request: TickerRequest, db: Session = Depends(get_db)):
    tickers = request.tickers
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)  # Fetch last 30 days of data
    results = []
    for ticker in tickers:
        result = fetch_and_save_stock_data(ticker, start_date, end_date, db)
        print('result', result)
        if result is None:
            results.append({"ticker": ticker, "message": f"Data is already up to date for {ticker}", "status": result['status']})
        else:
            results.append({"ticker": ticker, "message": result['message'], "status": result['status']})
    return {"results": results}

@router.post("/technical-analysis/golden-cross")
async def get_companies_with_golden_cross(request: GoldenCrossRequest, db: Session = Depends(get_db)):
    short_window = request.short_window
    long_window = request.long_window
    days_to_look_back = request.days_to_look_back
    min_volume = request.min_volume
    adjusted = request.adjusted

    # Fetch all tickers from the Companies table
    tickers = db.scalars(select(Company.ticker)).all()

    golden_cross_results = []
    for ticker in tickers:
        if ticker != 'MUR.WA':

            result = find_most_recent_golden_cross(
                ticker=ticker,
                short_window=short_window,
                long_window=long_window,
                min_volume=min_volume,
                adjusted=adjusted,
                max_days_since_cross=days_to_look_back,
                db=db
            )
            if result:
                golden_cross_results.append({"ticker": ticker, "data": result})

    if golden_cross_results:
        return {
            "status": "success",
            "data": golden_cross_results
        }
    else:
        raise HTTPException(status_code=404, detail="No golden crosses found for any companies.")

# Don't forget to include this router in your main.py
app.include_router(router)
