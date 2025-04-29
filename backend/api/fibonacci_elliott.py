# api/fibonacci_elliott.py
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from database.company import Company
from database.base import get_db
from database.stock_data import StockPriceHistory
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, List
from pydantic import BaseModel

router = APIRouter()


class FibonacciElliottRequest(BaseModel):
    tickers: List[str] = []
    markets: List[str] = []
    swing_window: int = 5
    min_volume: int = 1000000
    years_to_analyze: int = 3


class FibonacciLevels(BaseModel):
    level_0: float
    level_23_6: float
    level_38_2: float
    level_50: float
    level_61_8: float
    level_100: float


class ElliottWave(BaseModel):
    position: int
    type: str
    value: float


class FibonacciElliottResponse(BaseModel):
    ticker: str
    fibonacci_levels: FibonacciLevels
    current_price: float
    swing_high: float
    swing_low: float
    elliott_waves: List[ElliottWave]
    signal: str
    analysis_date: str


def calculate_fib_levels(swing_high: float, swing_low: float) -> dict:
    difference = swing_high - swing_low
    return {
        "level_0": swing_high,
        "level_23_6": swing_high - difference * 0.236,
        "level_38_2": swing_high - difference * 0.382,
        "level_50": swing_high - difference * 0.5,
        "level_61_8": swing_high - difference * 0.618,
        "level_100": swing_low,
    }


def identify_elliott_waves(data: pd.DataFrame) -> List[Dict]:
    """Uproszczona identyfikacja fal Elliotta"""
    # Tutaj implementuj bardziej zaawansowaną logikę
    waves = []
    closes = data["close"].values

    # Przykładowa implementacja - w rzeczywistości potrzebujesz bardziej zaawansowanego algorytmu
    for i in range(2, len(closes) - 2):
        if closes[i] > closes[i - 1] and closes[i] > closes[i + 1]:
            waves.append({"position": i, "type": "peak", "value": closes[i]})
        elif closes[i] < closes[i - 1] and closes[i] < closes[i + 1]:
            waves.append({"position": i, "type": "trough", "value": closes[i]})

    return waves


@router.get("/analyze/{ticker}", response_model=FibonacciElliottResponse)
async def analyze_single_ticker(
    ticker: str = Path(..., description="Ticker symbol to analyze"),
    swing_window: int = 5,
    min_volume: int = 100000,
    years_to_analyze: int = 3,
    db: Session = Depends(get_db),
):
    try:
        # Get historical data for single ticker
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * years_to_analyze)

        prices = (
            db.query(
                StockPriceHistory.date,
                StockPriceHistory.high,
                StockPriceHistory.low,
                StockPriceHistory.close,
                StockPriceHistory.volume,
            )
            .join(Company, StockPriceHistory.company_id == Company.company_id)
            .filter(
                Company.ticker == ticker,
                StockPriceHistory.date >= start_date,
                StockPriceHistory.date <= end_date,
                StockPriceHistory.volume >= min_volume,
            )
            .all()
        )

        if not prices:
            raise HTTPException(
                status_code=404, detail=f"No data found for ticker {ticker}"
            )

        df = pd.DataFrame(
            [
                {
                    "date": p.date,
                    "high": p.high,
                    "low": p.low,
                    "close": p.close,
                    "volume": p.volume,
                }
                for p in prices
            ]
        )

        # Calculate Fibonacci levels
        swing_high = df["high"].rolling(window=swing_window).max().dropna().iloc[-1]
        swing_low = df["low"].rolling(window=swing_window).min().dropna().iloc[-1]
        fib_levels = calculate_fib_levels(swing_high, swing_low)

        # Identify Elliott Waves
        waves = identify_elliott_waves(df)

        # Determine signal
        current_price = df["close"].iloc[-1]
        signal = "neutral"
        if current_price <= fib_levels["level_61_8"]:
            signal = "buy"
        elif current_price >= fib_levels["level_23_6"]:
            signal = "sell"

        return {
            "ticker": ticker,
            "fibonacci_levels": fib_levels,
            "current_price": current_price,
            "swing_high": swing_high,
            "swing_low": swing_low,
            "elliott_waves": waves,
            "signal": signal,
            "analysis_date": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
