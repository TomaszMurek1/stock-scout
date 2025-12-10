from datetime import date
from pydantic import BaseModel
from typing import List


class TickersRequest(BaseModel):
    tickers: List[str]
    start_date: date
    end_date: date


class GoldenCrossRequest(BaseModel):
    short_window: int = 50
    long_window: int = 200
    days_to_look_back: int = 90
    min_volume: int = 1_000_000
    adjusted: bool = True
    markets: List[str] | None = None
    basket_ids: List[int] | None = None
    min_market_cap: float | None = None


class BreakoutRequest(BaseModel):
    consolidation_period: int
    threshold_percentage: float
    basket_ids: List[int] | None = None
    min_market_cap: float | None = None



class TickerRequestAdmin(BaseModel):
    country: str
    market: str
