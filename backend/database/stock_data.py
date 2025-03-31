from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from .base import Base

class CompanyMarketData(Base):
    """
    Stores frequently updated stock market data.
    """
    __tablename__ = 'company_market_data'

    market_data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)

    # Stock Market Data
    current_price = Column(Float, nullable=True)
    previous_close = Column(Float, nullable=True)
    day_high = Column(Float, nullable=True)
    day_low = Column(Float, nullable=True)
    fifty_two_week_high = Column(Float, nullable=True)
    fifty_two_week_low = Column(Float, nullable=True)
    market_cap = Column(Float, nullable=True)
    price_to_book = Column(Float, nullable=True)

    # Trading Details
    volume = Column(Integer, nullable=True)
    average_volume = Column(Integer, nullable=True)
    bid_price = Column(Float, nullable=True)
    ask_price = Column(Float, nullable=True)
    year_change = Column(Float, nullable=True)
    fifty_day_average = Column(Float, nullable=True)
    two_hundred_day_average = Column(Float, nullable=True)
    shares_outstanding = Column(Float, nullable=True)

    last_updated = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    company = relationship("Company", back_populates="market_data")
    market = relationship("Market", back_populates="market_data")

class StockPriceHistory(Base):
    __tablename__ = 'stock_price_history'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')
    market = relationship('Market')

    __table_args__ = (
        UniqueConstraint('company_id', 'market_id', 'date', name='_company_market_date_uc'),
        Index('idx_stockpricehistory_date', 'date')
    )
