from sqlalchemy import Column, ForeignKey, Integer, String, Index
from sqlalchemy.orm import relationship
from .company import company_market_association, company_stockindex_association
from .base import Base


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
