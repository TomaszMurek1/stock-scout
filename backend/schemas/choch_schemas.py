from pydantic import BaseModel
from typing import List

class ChochRequest(BaseModel):
    timeframe: str = "1d"
    lookback_period: int = 14  # For identifying local highs/lows
    days_to_check: int = 60    # How far back to look for the pattern setup
    basket_ids: List[int] | None = None
    markets: List[str] | None = None
    min_market_cap: float | None = None
