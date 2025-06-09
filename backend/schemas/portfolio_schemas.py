from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, condecimal


class TradeRequest(BaseModel):
    company_id: int
    quantity: Decimal
    price: Decimal


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
    shares: Decimal
    average_cost: Decimal
    market_price: Optional[Decimal]
    market_value: Optional[Decimal]
    unrealized: Optional[Decimal]

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
    rate: Decimal  # e.g. 3.7599
    date: date  # the date of the FX quote

    model_config = ConfigDict(from_attributes=True)


class TransactionItem(BaseModel):
    id: int
    ticker: str
    name: str
    transaction_type: Literal["buy", "sell"]
    shares: Decimal
    price: Decimal
    fee: Decimal
    timestamp: datetime
    currency: str
    currency_rate: Decimal


class FxHistoricalItem(BaseModel):
    date: date
    close: Decimal


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
