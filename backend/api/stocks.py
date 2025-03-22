from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from schemas.stock_schemas import TickerRequest
from services.stock_data_service import fetch_and_save_stock_history_data
from datetime import datetime, timedelta, timezone
import logging
import yfinance as yf
import pandas as pd
from database.models import Company, CompanyFinancials, Market, StockPriceHistory
from database.dependencies import get_db

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def get_or_fetch_stock_history(ticker: str, market_name: str, company_id: int, cutoff_date: datetime, db: Session):
    # Try fetching from DB
    stock_history = (
        db.query(StockPriceHistory.date, StockPriceHistory.close)
        .filter(StockPriceHistory.company_id == company_id)
        .filter(StockPriceHistory.date >= cutoff_date)
        .order_by(StockPriceHistory.date)
        .all()
    )

    # If not found, fetch new data
    if not stock_history:
        logger.info(f"No stock history found for {ticker}, fetching from source...")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=360)

        fetch_and_save_stock_history_data(ticker, market_name, start_date, end_date, db)
        db.expire_all()

        # Retry fetching
        stock_history = (
            db.query(StockPriceHistory.date, StockPriceHistory.close)
            .filter(StockPriceHistory.company_id == company_id)
            .filter(StockPriceHistory.date >= cutoff_date)
            .order_by(StockPriceHistory.date)
            .all()
        )

    return stock_history

def get_company_by_ticker(ticker: str, db: Session) -> Company:
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found...")
    return company


def get_company_market(company: Company, db: Session) -> Market | None:
    if not company.markets:
        return None
    return db.query(Market).filter(Market.market_id == company.markets[0].market_id).first()


def get_company_financials(company: Company, db: Session) -> dict:
    financials = db.query(CompanyFinancials).filter(CompanyFinancials.company_id == company.company_id).first()
    if not financials:
        raise HTTPException(status_code=404, detail="Financial data not found.")
    return {
        "gross_margin": financials.gross_margins,
        "operating_margin": financials.operating_margins,
        "net_margin": financials.profit_margins,
    }


def build_executive_summary(company: Company, market: Market | None) -> dict:
    return {
        "ticker": company.ticker,
        "name": company.name,
        "sector": company.sector,
        "industry": company.industry,
        "currency": market.currency if market else "Unknown",
    }


def build_technical_analysis(stock_history: list[tuple], window_50: int = 50, window_200: int = 200) -> dict:
    df = pd.DataFrame(stock_history, columns=["date", "close"])
    df["SMA_50"] = df["close"].rolling(window=window_50).mean()
    df["SMA_200"] = df["close"].rolling(window=window_200).mean()

    return {
        "stock_prices": df[["date", "close"]].dropna().to_dict(orient="records"),
        "sma_50": df[["date", "SMA_50"]].dropna().to_dict(orient="records"),
        "sma_200": df[["date", "SMA_200"]].dropna().to_dict(orient="records"),
    }

@router.get("/{ticker}")
def get_stock_details(ticker: str, db: Session = Depends(get_db)):
    company = get_company_by_ticker(ticker, db)
    market = get_company_market(company, db)

    executive_summary = build_executive_summary(company, market)
    financial_performance = get_company_financials(company, db)

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=730)
    stock_history = get_or_fetch_stock_history(
        ticker,
        market.name if market else "Unknown",
        company.company_id,
        cutoff_date,
        db,
    )

    if not stock_history:
        raise HTTPException(status_code=404, detail="Stock price history not found.")

    technical_analysis = build_technical_analysis(stock_history)

    return {
        "executive_summary": executive_summary,
        "financial_performance": financial_performance,
        "technical_analysis": technical_analysis,
    }


# @router.post("/fetch-stock-data")
# async def fetch_stock_data(request: TickerRequest, db: Session = Depends(get_db)):
#     tickers = request.tickers
#     end_date = datetime.now()
#     start_date = end_date - timedelta(days=360)
    
#     results = []
#     for ticker in tickers:
#         try:
#             result = fetch_and_save_stock_history_data(ticker, start_date, end_date, db)
#             results.append({"ticker": ticker, "message": result["message"], "status": result["status"]})
#         except Exception as e:
#             logger.error(f"Error fetching {ticker}: {e}", exc_info=True)
#             raise HTTPException(status_code=500, detail=f"Error processing {ticker}")

#     return {"results": results}