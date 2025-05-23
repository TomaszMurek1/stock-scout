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
    markets: List[str]


class TickerRequestAdmin(BaseModel):
    country: str
    market: str
