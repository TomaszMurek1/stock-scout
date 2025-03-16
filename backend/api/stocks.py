from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from schemas.stock_schemas import TickerRequest
from services.stock_data_service import fetch_and_save_stock_data
from datetime import datetime, timedelta, timezone
import logging
import yfinance as yf
import pandas as pd
from database.models import Company, CompanyFinancials, Market, StockPriceHistory
from database.dependencies import get_db

router = APIRouter()

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



@router.get("/{ticker}")
def get_stock_details(ticker: str, db: Session = Depends(get_db)):
    """
    Returns comprehensive stock details, including:
    1) Executive Summary
    2) Financial Performance
    3) Technical Analysis (Stock Price & SMA 50/200)
    """

    # 1️⃣ Executive Summary
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    # Get company currency from its market
    market = db.query(Market).filter(Market.market_id == company.markets[0].market_id).first() if company.markets else None

    executive_summary = {
        "ticker": company.ticker,
        "name": company.name,
        "sector": company.sector,
        "industry": company.industry,
        "currency": market.currency if market else "Unknown",
    }

    # 2️⃣ Financial Performance
    financials = db.query(CompanyFinancials).filter(CompanyFinancials.company_id == company.company_id).first()
    if not financials:
        raise HTTPException(status_code=404, detail="Financial data not found.")


    financial_performance = {
        "gross_margin": financials.gross_margins,
        "operating_margin": financials.operating_margins,
        "net_margin": financials.profit_margins,
    }

    # 3️⃣ Technical Analysis (Stock Price & SMA 50/200)
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=730)  # Last 2 years
    stock_history = (
        db.query(StockPriceHistory.date, StockPriceHistory.close)
        .filter(StockPriceHistory.company_id == company.company_id)
        .filter(StockPriceHistory.date >= cutoff_date)
        .order_by(StockPriceHistory.date)
        .all()
    )

    if not stock_history:
        raise HTTPException(status_code=404, detail="Stock price history not found.")

    # Convert to DataFrame
    stock_df = pd.DataFrame(stock_history, columns=["date", "close"])

    # Calculate SMAs
    stock_df["SMA_50"] = stock_df["close"].rolling(window=50).mean()
    stock_df["SMA_200"] = stock_df["close"].rolling(window=200).mean()

    # Convert to JSON format
    technical_analysis = {
        "stock_prices": stock_df[["date", "close"]].dropna().to_dict(orient="records"),
        "sma_50": stock_df[["date", "SMA_50"]].dropna().to_dict(orient="records"),
        "sma_200": stock_df[["date", "SMA_200"]].dropna().to_dict(orient="records"),
    }

    return {
        "executive_summary": executive_summary,
        "financial_performance": financial_performance,
        "technical_analysis": technical_analysis,
    }