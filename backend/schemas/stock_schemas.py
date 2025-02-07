from pydantic import BaseModel
from typing import List

class TickerRequest(BaseModel):
    tickers: List[str]

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
