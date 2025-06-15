from datetime import datetime, date

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, condecimal


class TradeRequest(BaseModel):
    company_id: int
    quantity: float
    price: float


class TradeBase(BaseModel):
    ticker: str
    shares: condecimal(gt=0)  # positive
    price: condecimal(gt=0)
    fee: Optional[condecimal(ge=0)] = 0
    currency: str = "USD"
    currency_rate: Optional[condecimal(gt=0)] = 1.0


class TradeResponse(BaseModel):
    message: str


class PositionOut(BaseModel):
    ticker: str
    company_id: int
    shares: float
    average_cost: float
    market_price: Optional[float]
    market_value: Optional[float]
    unrealized: Optional[float]

    class Config:
        orm_mode = True


class PortfolioData(BaseModel):
    holdings: List[PositionOut]
    watchlist: List[str]


class PortfolioSummary(BaseModel):
    id: int
    name: str
    currency: str


class HoldingItem(BaseModel):
    ticker: str
    name: str
    shares: float
    average_price: float
    last_price: Optional[float] = None
    currency: Optional[str] = None


class WatchlistItem(BaseModel):
    ticker: str
    name: str


class PriceHistoryItem(BaseModel):
    ticker: str
    date: datetime  # or `str` if you prefer
    close: float


class PriceHistoryRequest(BaseModel):
    tickers: List[str]
    period: str = "1M"
    start_date: Optional[str] = None  # <-- add this line

    class Config:
        # allow extra if you want, but we don’t need it now
        orm_mode = True


class PortfolioInfo(BaseModel):
    id: int
    name: str
    currency: str


class WatchItem(BaseModel):
    ticker: str
    name: str


class RateItem(BaseModel):
    base: str  # e.g. "USD"
    quote: str  # e.g. "PLN"
    rate: float  # e.g. 3.7599
    date: date  # the date of the FX quote

    model_config = ConfigDict(from_attributes=True)


class TransactionItem(BaseModel):
    id: int
    ticker: str
    name: str
    transaction_type: Literal["buy", "sell"]
    shares: float
    price: float
    fee: float
    timestamp: datetime
    currency: str
    currency_rate: float


class FxHistoricalItem(BaseModel):
    date: date
    close: float


class FxBatch(BaseModel):
    base: str
    quote: str
    historicalData: list[FxHistoricalItem]


class PriceHistoryEntry(BaseModel):
    date: str  # or datetime if you want, but use str if you .isoformat() it
    close: float


class UserPortfolioResponse(BaseModel):
    portfolio: PortfolioInfo
    transactions: List[TransactionItem]
    watchlist: List[WatchItem]
    currency_rates: dict[str, FxBatch]
    price_history: Dict[str, List[PriceHistoryEntry]]
