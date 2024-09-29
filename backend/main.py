from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.database.database import Base, engine, get_db
from backend.auth import router as auth_router
from backend.services.stock_data_service import fetch_and_save_stock_data
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

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

@router.post("/fetch-stock-data/{ticker}")
async def fetch_stock_data(ticker: str, db: Session = Depends(get_db)):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)  # Fetch last 30 days of data
    result = fetch_and_save_stock_data(ticker, start_date, end_date, db)
    if result is None:
        return {"message": f"Data is already up to date for {ticker}"}
    print(result)
    return {"message": result['message']}

app.include_router(router)
