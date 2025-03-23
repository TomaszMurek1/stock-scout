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
from datetime import datetime, timezone
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

    companies = relationship('Company', secondary=company_market_association, back_populates='markets')
    analysis_results = relationship("AnalysisResult", back_populates="market")
    financials = relationship("CompanyFinancials", back_populates="market", cascade="all, delete-orphan")
    market_data = relationship("CompanyMarketData", back_populates="market", cascade="all, delete-orphan")
    indexes = relationship('StockIndex', back_populates='market', cascade='all, delete-orphan')
    financial_history = relationship("CompanyFinancialHistory",back_populates="market",cascade="all, delete-orphan")

class StockIndex(Base):
    __tablename__ = 'stock_indexes'

    index_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)

    market = relationship('Market', back_populates='indexes')
    companies = relationship('Company', secondary=company_stockindex_association, back_populates='stock_indexes')

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

    markets = relationship('Market', secondary=company_market_association, back_populates='companies')
    stock_indexes = relationship('StockIndex', secondary=company_stockindex_association, back_populates='companies')
    analysis_results = relationship("AnalysisResult", back_populates="company")
    financials = relationship("CompanyFinancials", back_populates="company", cascade="all, delete-orphan")
    financial_history = relationship("CompanyFinancialHistory", back_populates="company", cascade="all, delete-orphan") 
    market_data = relationship("CompanyMarketData", back_populates="company", cascade="all, delete-orphan")

    # ✅ Added missing relationship to `CompanyOverview`
    overview = relationship("CompanyOverview", back_populates="company", uselist=False)

    __table_args__ = (
        UniqueConstraint('ticker', name='_company_ticker_uc'),
        Index('idx_companies_ticker', 'ticker'),
    )

# ---------------------------
# Stock Price History (Partitioned)
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

    company = relationship('Company')
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

# ---------------------------
# Analysis Result Model
# ---------------------------
class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)
    
    analysis_type = Column(String, nullable=False)  # e.g., "golden_cross", "death_cross"
    short_window = Column(Integer)
    long_window = Column(Integer)
    cross_date = Column(Date, nullable=True)
    cross_price = Column(Float, nullable=True)
    days_since_cross = Column(Integer, nullable=True)

    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship('Company', back_populates='analysis_results')
    market = relationship('Market', back_populates='analysis_results')

# ---------------------------
# Company Overview (Static Data)
# ---------------------------
class CompanyOverview(Base):
    __tablename__ = 'company_overview'

    company_id = Column(Integer, ForeignKey('companies.company_id'), primary_key=True)
    long_name = Column(String, nullable=False)
    short_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    full_time_employees = Column(Integer, nullable=True)
    website = Column(String, nullable=True)
    headquarters_address = Column(String, nullable=True)
    headquarters_city = Column(String, nullable=True)
    headquarters_country = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    description = Column(String, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="overview")

# ---------------------------
# Company Financials (Quarterly Updated Data)
# ---------------------------
class CompanyFinancials(Base):
    """
    Stores fundamental financial metrics that are updated periodically.
    """
    __tablename__ = 'company_financials'

    financials_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)

    # Financial Metrics
    enterprise_value = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    net_income = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    earnings_growth = Column(Float, nullable=True)
    revenue_growth = Column(Float, nullable=True)
    gross_profit = Column(Float, nullable=True)
    gross_margins = Column(Float, nullable=True)
    operating_margins = Column(Float, nullable=True)
    profit_margins = Column(Float, nullable=True)
    return_on_assets = Column(Float, nullable=True)
    return_on_equity = Column(Float, nullable=True)
    
    last_fiscal_year_end = Column(DateTime, nullable=True)
    most_recent_quarter = Column(DateTime, nullable=True)

    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="financials")
    market = relationship("Market", back_populates="financials")

# ---------------------------
# Company Market Data (Daily Updates)
# ---------------------------
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

    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="market_data")
    market = relationship("Market", back_populates="market_data")


class CompanyFinancialHistory(Base):
    __tablename__ = "company_financial_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)
    quarter_end_date = Column(DateTime, nullable=False, index=True)
    net_income = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    last_updated = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    company = relationship("Company", back_populates="financial_history")
    market = relationship("Market", back_populates="financial_history")
