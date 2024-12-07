from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database.database import Base, engine, get_db
from auth import router as auth_router
from services.stock_data_service import fetch_and_save_stock_data
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from services.technical_analysis_service import find_most_recent_golden_cross
from database.models import Company, Market
import time
from pytickersymbols import PyTickerSymbols

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:5173", 
     "http://localhost:3000" # React frontend
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
    markets: List[str] 
# @app.on_event("startup")
# async def log_routes():
#     for route in app.routes:
#         print(f"Route: {route.path} | Methods: {route.methods}")

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
    markets = request.markets


    start_time = time.time()  # Record the start time
    tickers2 = db.scalars(select(Company.ticker)).all()
    #print(f"Tickers fetched: {tickers2}")  # Debug log

    if not tickers2:
        raise HTTPException(status_code=404, detail="No tickers found in the database.")

    print(markets)
    # Fetch all companies for given list of market's names
    companies = db.query(Company.ticker, Market.name.label('market_name')).join(Market).filter(Market.name.in_(markets)).all()
    print('main.py',companies,  markets)

    if not companies:
        raise HTTPException(status_code=404, detail="No companies found for the selected markets.")

    golden_cross_results = []
    for company in companies[:10000]:
        print(company)
        ticker = company.ticker
        market = company.market_name
        if ticker != 'ALL.WA':

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
    print(processing_time)
    if golden_cross_results:
        return {
            "status": "success",
            "data": golden_cross_results
        }
    else:
        raise HTTPException(status_code=404, detail="No golden crosses found for any companies.")
    

class TickerRequest(BaseModel):
    country: str
    market: str


INDEX_MAPPING = {
    "GSPC": "S&P 500",      # S&P 500
    "NDX": "NASDAQ 100",    # NASDAQ-100
    "DJI": "Dow Jones",     # Dow Jones Industrial Average:
    "FTSE": "FTSE 100"    
}

stock_data = PyTickerSymbols()

# Define the route to create tickers based on country and exchange/market
@router.post("/admin/create-tickers2")
def create_tickers2(ticker_request: TickerRequest, db: Session = Depends(get_db)):
    country = ticker_request.country
    market = ticker_request.market
    try:
        # Check if the market already exists in the database
        db_market = db.query(Market).filter(Market.name == market).first()
        if not db_market:
            # If market does not exist, create it
            db_market = Market(name=market, country=country)
            db.add(db_market)
            db.commit()
            db.refresh(db_market)  # Get the new market ID

        # Retrieve index name based on the market symbol
        index_name = INDEX_MAPPING.get(market)
        if not index_name:
            raise HTTPException(status_code=400, detail="Invalid or unsupported market symbol provided.")

        # Fetch tickers for the given index using pytickersymbols
        try:
            companies = stock_data.get_stocks_by_index(index_name)
            if not companies:
                raise HTTPException(status_code=400, detail="No companies found for the specified index.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error fetching data from pytickersymbols: {str(e)}")

        # Loop through the companies and add them to the database if they don't exist
        print('companies',companies)
        for company in companies:
            print(company)
            ticker = company.get("symbol")
            name = company.get("name")
            sector = company.get("sector", None)
            industry = company.get("industry", None)

            # Check if the company with the ticker already exists
            # existing_company = db.query(Company).filter(Company.ticker == ticker).first()

            # if existing_company:
            #     # If the company already exists, skip adding it
            #     continue

            # Prepare company data
            company_data = {
                'name': name,
                'ticker': ticker,
                'market_id': db_market.market_id,
                'sector': sector,
                'industry': industry,
            }

            # Add the new company to the database
            new_company = Company(**company_data)
            db.add(new_company)

        # Commit all changesd
        db.commit()
        return {"message": "Companies and tickers have been created successfully."}

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="There was an issue with the database operation.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")




app.include_router(router)