from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, condecimal


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
    curency_rate: Optional[condecimal(gt=0)] = 1.0


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


class PortfolioInfo(BaseModel):
    id: int
    name: str


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


class RateItem(BaseModel):
    from_: str = Field(..., alias="from")
    to: str
    rate: float

    model_config = {
        "populate_by_name": True,  # allow using `from_` in code
        "json_encoders": {},
    }


class UserPortfolioResponse(BaseModel):
    portfolio: PortfolioSummary
    holdings: List[HoldingItem]
    watchlist: List[WatchlistItem]
    currency_rates: List[RateItem]


class TransactionItem(BaseModel):
    ticker: str  # e.g. "AAPL"
    quantity: Decimal  # number of shares
    price: Decimal  # price per share at trade
    fee: Decimal  # trade fee
    total_value: Decimal  # quantity * price ± fee
    timestamp: datetime  # when trade happened

    class Config:
        orm_mode = True


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
