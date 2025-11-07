from sqlalchemy import Column, Integer, String, Enum as SQLAlchemyEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from database.base import Base

class InstrumentType(PyEnum):
    STOCK = "stock"
    ETF = "etf"
    BOND = "bond"
    CRYPTO = "crypto"
    COMMODITY = "commodity"
    CASH = "cash"

class Instrument(Base):
    __tablename__ = "instruments"
    __table_args__ = (
        UniqueConstraint("symbol", "market_id", name="uq_instrument_symbol_market"),
    )

    id = Column(Integer, primary_key=True)
    type = Column(SQLAlchemyEnum(InstrumentType), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)   # e.g., "AAPL", "BTC", "CASH-PLN"
    name = Column(String(200), nullable=False)
    currency = Column(String(3), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.market_id"), nullable=True)
    isin = Column(String(12), nullable=True, index=True)
    figi = Column(String(12), nullable=True, index=True)

    market = relationship("Market")
