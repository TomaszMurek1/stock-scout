from datetime import datetime, date, time
from decimal import Decimal
from enum import Enum as PyEnum
from typing import  Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TransactionType(PyEnum):
    BUY = "BUY"
    SELL = "SELL"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    DIVIDEND = "DIVIDEND"
    INTEREST = "INTEREST"
    FEE = "FEE"
    TAX = "TAX"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT ="TRANSFER_OUT"


class TradeRequest(BaseModel):
    company_id: int
    quantity: float
    price: float


class TradeBase(BaseModel):
    ticker: str
    shares: float
    price: float
    fee: Optional[float] = None
    currency: str
    currency_rate: Optional[float] = None

    # NEW
    trade_date: date

    def to_timestamp(self) -> datetime:
        # tolerate older versions missing the field to avoid AttributeError
        tt = getattr(self, "trade_time", None)
        t = tt or time(23, 59, 59)
        return datetime.combine(self.trade_date, t)


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

    model_config = ConfigDict(from_attributes=True)


class PortfolioData(BaseModel):
    holdings: List[PositionOut]
    watchlist: List[str]


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
    transaction_type: TransactionType
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

class TransactionOut(BaseModel):
    id: int
    ticker: Optional[str] = None
    name: Optional[str] = None
    transaction_type: TransactionType
    shares: float
    price: float | None
    fee: float
    timestamp: str
    currency: str
    currency_rate: float


class PortfolioMini(BaseModel):
    id: int
    name: str
    base_currency: str


class PortfolioMgmtTotals(BaseModel):
    # Point-in-time, whole portfolio
    total_portfolio_value: Decimal                       # MV_open + cash (as_of)
    cash_balance: Decimal                                # by_cash (as_of)
    market_value_open: Decimal                           # MV of open positions (as_of)

    # Snapshot metrics on OPEN positions only
    cost_basis_open: Decimal                             # FIFO cost of open lots (txn-based)
    percentage_change_open: Optional[float]              # (MV_open - cost_basis_open)/cost_basis_open

    # Snapshot total return for OPEN positions (income added)
    dividends_interest_total: Decimal                    # total dividends + interest (all time to as_of)
    total_return_open: Optional[float]                   # ((MV_open - cost_basis_open) + income)/cost_basis_open

    # Snapshot after-costs total return for OPEN positions (income - costs)
    fees_standalone_total: Decimal                       # sum of standalone FEE/TAX transactions
    buy_sell_fees_total: Decimal                         # sum of fees on BUY/SELL transactions
    taxes_total: Decimal                                 # TAX total if you keep it separately
    total_costs: Decimal                                 # buy_sell_fees_total + fees_standalone_total + taxes_total
    total_return_open_after_costs: Optional[float]       # ((MV_open - cost_basis_open) + income - costs)/cost_basis_open

    # Cash-flow view (external)
    net_external_cash: Decimal                           # Σ net external flows to date (deposits - withdrawals +/- transfers etc.)



class PortfolioMgmtSeriesItem(BaseModel):
    date: date
    total_value: Decimal
    net_contributions: Decimal  # daily PVD external+internal cash effect stored in your table

    model_config = ConfigDict(from_attributes=True)


class PeriodReturns(BaseModel):
    YTD: Optional[float] = None
    one_year: Optional[float] = Field(default=None, alias="1Y")
    two_years: Optional[float] = Field(default=None, alias="2Y")

    # allow populating by field name; FastAPI will serialize using aliases
    model_config = ConfigDict(populate_by_name=True)
    
class PortfolioHeader(BaseModel):
    id: int
    name: str
    base_currency: str

class PortfolioMgmtResponse(BaseModel):
    portfolio: PortfolioHeader
    as_of: date
    totals: PortfolioMgmtTotals
    period_returns: PeriodReturns
    series: List[Dict]   