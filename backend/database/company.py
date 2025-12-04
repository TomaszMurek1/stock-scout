from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    DateTime,
    Table,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

# ---------------------------
# Association Tables
# ---------------------------
company_stockindex_association = Table(
    "company_stockindex_association",
    Base.metadata,
    Column("company_id", Integer, ForeignKey("companies.company_id"), primary_key=True),
    Column("index_id", Integer, ForeignKey("stock_indexes.index_id"), primary_key=True),
)


class CompanyESGData(Base):
    __tablename__ = "company_esg_data"

    esg_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    total_esg_score = Column(Float, nullable=True)
    environment_score = Column(Float, nullable=True)
    social_score = Column(Float, nullable=True)
    governance_score = Column(Float, nullable=True)
    highest_controversy = Column(Integer, nullable=True)

    rating_year = Column(Integer, nullable=True)
    rating_month = Column(Integer, nullable=True)
    peer_group = Column(String, nullable=True)

    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", backref="esg_data")


class Company(Base):
    __tablename__ = "companies"

    company_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    ticker = Column(String, nullable=False, index=True)
    isin = Column(String, nullable=True, index=True)  # Added ISIN column
    sector = Column(String)
    industry = Column(String)
    yfinance_market = Column(String)
    market_id = Column(Integer, ForeignKey("markets.market_id"))
    market = relationship("Market", back_populates="companies")  # <-- CHANGED HERE
    stock_indexes = relationship(
        "StockIndex",
        secondary=company_stockindex_association,
        back_populates="companies",
    )
    analysis_results = relationship("AnalysisResult", back_populates="company")
    financials = relationship(
        "CompanyFinancials", back_populates="company", cascade="all, delete-orphan"
    )
    financial_history = relationship(
        "CompanyFinancialHistory",
        back_populates="company",
        cascade="all, delete-orphan",
    )
    market_data = relationship(
        "CompanyMarketData", back_populates="company", cascade="all, delete-orphan"
    )

    overview = relationship("CompanyOverview", back_populates="company", uselist=False)

    __table_args__ = (
        UniqueConstraint("ticker", name="_company_ticker_uc"),
        Index("idx_companies_ticker", "ticker"),
    )


class CompanyOverview(Base):
    __tablename__ = "company_overview"

    company_id = Column(Integer, ForeignKey("companies.company_id"), primary_key=True)
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
