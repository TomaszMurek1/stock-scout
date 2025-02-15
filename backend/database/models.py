from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Float,
    ForeignKey,
    Table,
    UniqueConstraint,
    Index,
    DateTime
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# ---------------------------
# Association Tables
# ---------------------------
company_stockindex_association = Table(
    'company_stockindex_association',
    Base.metadata,
    Column('company_id', Integer, ForeignKey('companies.company_id'), primary_key=True),
    Column('index_id', Integer, ForeignKey('stock_indexes.index_id'), primary_key=True)
)

# Many-to-many between Company and Market (NEW)
company_market_association = Table(
    'company_market_association',
    Base.metadata,
    Column('company_id', Integer, ForeignKey('companies.company_id'), primary_key=True),
    Column('market_id', Integer, ForeignKey('markets.market_id'), primary_key=True)
)

# ---------------------------
# Market + Index Models
# ---------------------------
class Market(Base):
    __tablename__ = 'markets'

    market_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    country = Column(String)
    currency = Column(String)
    timezone = Column(String)
    exchange_code = Column(String)

    # Many-to-many with Company
    companies = relationship(
        'Company',
        secondary=company_market_association,
        back_populates='markets'
    )
    indexes = relationship('StockIndex', back_populates='market', cascade='all, delete-orphan')

class StockIndex(Base):
    __tablename__ = 'stock_indexes'

    index_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)

    market = relationship('Market', back_populates='indexes')
    companies = relationship(
        'Company',
        secondary=company_stockindex_association,
        back_populates='stock_indexes'
    )

    __table_args__ = (Index('idx_indexes_name', 'name'),)

# ---------------------------
# Company Model
# ---------------------------
class Company(Base):
    __tablename__ = 'companies'

    company_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    ticker = Column(String, nullable=False, index=True)
    sector = Column(String)
    industry = Column(String)

    # Many-to-many with Market
    markets = relationship(
        'Market',
        secondary=company_market_association,
        back_populates='companies'
    )

    # Many-to-many with StockIndex
    stock_indexes = relationship(
        'StockIndex',
        secondary=company_stockindex_association,
        back_populates='companies'
    )

    __table_args__ = (
        UniqueConstraint('ticker', name='_company_ticker_uc'),
        Index('idx_companies_ticker', 'ticker'),
    )

# ---------------------------
# Single Historical Table (Partitioned)
# ---------------------------
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

    company = relationship('Company')  # or back_populates='stock_price_history'
    market = relationship('Market')

    __table_args__ = (
        UniqueConstraint('company_id', 'market_id', 'date', name='_company_market_date_uc'),
        Index('idx_stockpricehistory_date', 'date'),
    )

# ---------------------------
# User Model
# ---------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)