from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, selectinload
from services.auth.auth import get_current_user
from database.base import get_db
from database.stock_data import StockPriceHistory
from database.company import Company
from database.user import User
from schemas.portfolio_schemas import (
    PriceHistoryRequest,

)
from collections import defaultdict
import pandas as pd

router = APIRouter(prefix="", tags=["Stock Data"])

@router.get("/{ticker}/candles")
def get_stock_candles(
    ticker: str,
    db: Session = Depends(get_db),
):
    """
    Returns weekly candles for the last 52 weeks + volume info.
    """
    ticker = ticker.upper().strip()
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(404, "Company not found")

    # Last 52 weeks ~ 1 year. Let's fetch 400 days to be safe for weekly aggregation
    cutoff_date = (datetime.utcnow() - timedelta(days=400)).date()

    records = (
        db.query(StockPriceHistory)
        .filter(
            StockPriceHistory.company_id == company.company_id,
            StockPriceHistory.date >= cutoff_date
        )
        .order_by(StockPriceHistory.date)
        .all()
    )

    if not records:
        return JSONResponse(content=[])

    # Convert to DataFrame
    data = [
        {
            "date": pd.to_datetime(r.date),
            "open": r.open,
            "high": r.high,
            "low": r.low,
            "close": r.close,
            "volume": r.volume or 0
        }
        for r in records
    ]
    df = pd.DataFrame(data)
    df.set_index("date", inplace=True)

    # Resample to Weekly
    # 'W-FRI' means weekly ending on Friday, consistent with most stock charts
    agg_dict = {
        "open": "first",
        "high": "max",
        "low": "min",
        "close": "last",
        "volume": "sum"
    }
    
    # Resample
    df_weekly = df.resample("W-FRI").agg(agg_dict).dropna()
    
    # Slice to last 52 weeks if we fetched more
    df_weekly = df_weekly.iloc[-52:]

    # Format for response
    result = []
    for date, row in df_weekly.iterrows():
        result.append({
            "date": date.isoformat(),
            "open": row["open"],
            "high": row["high"],
            "low": row["low"],
            "close": row["close"],
            "volume": int(row["volume"])
        })

    return JSONResponse(content=result)

# TODO: investigate do we need  still need start_date here to be used
@router.post("/price-history")
def price_history(
    req: PriceHistoryRequest,
    db: Session = Depends(get_db),
):
    # 1) Determine cutoff_date via start_date > period > All
    if req.start_date:
        try:
            cutoff_date = datetime.fromisoformat(req.start_date).date()
        except ValueError:
            raise HTTPException(400, "start_date must be YYYY-MM-DD")
    elif req.period.upper() == "ALL":
        cutoff_date = None
    else:
        mapping = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}
        days = mapping.get(req.period.upper(), 30)
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).date()

    # 2) Map tickers → company_ids
    companies = db.query(Company).filter(Company.ticker.in_(req.tickers)).all()
    if not companies:
        raise HTTPException(404, "No matching companies")
    id_map = {c.company_id: c.ticker for c in companies}
    company_ids = list(id_map.keys())

    # 3) Query price history from cutoff_date (if any)
    query = db.query(StockPriceHistory).filter(
        StockPriceHistory.company_id.in_(company_ids)
    )
    if cutoff_date:
        query = query.filter(StockPriceHistory.date >= cutoff_date)

    records = query.order_by(StockPriceHistory.company_id, StockPriceHistory.date).all()

    # --- NEW: group results by ticker ---
    data = defaultdict(list)
    for r in records:
        ticker = id_map[r.company_id]
        data[ticker].append({"date": r.date.isoformat(), "close": r.close})

    # Convert defaultdict to normal dict for JSON serialization
    return JSONResponse(content=data)
