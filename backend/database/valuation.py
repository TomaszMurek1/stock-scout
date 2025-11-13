from datetime import datetime
from sqlalchemy import Column, Integer, Date, Numeric, DateTime, ForeignKey, String, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from database.base import Base

class PortfolioValuationDaily(Base):
    __tablename__ = "portfolio_valuation_daily"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "date", name="uq_pv_portfolio_date"),
        Index("idx_pv_portfolio_date", "portfolio_id", "date"),
    )

    id = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    date = Column(Date, nullable=False)

    total_value = Column(Numeric(20, 4), nullable=False)

    # Optional denormalized breakdowns for fast charts (keep if helpful)
    by_stock = Column(Numeric(20, 4), nullable=False, default=0)
    by_etf = Column(Numeric(20, 4), nullable=False, default=0)
    by_bond = Column(Numeric(20, 4), nullable=False, default=0)
    by_crypto = Column(Numeric(20, 4), nullable=False, default=0)
    by_commodity = Column(Numeric(20, 4), nullable=False, default=0)
    by_cash = Column(Numeric(20, 4), nullable=False, default=0)

    # Daily net external cash flows (deposits - withdrawals - fees - taxes) in base ccy
    net_contributions = Column(Numeric(20, 4), nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    portfolio = relationship("Portfolio")


class PortfolioReturns(Base):
    __tablename__ = "portfolio_returns"
    
    id = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    date = Column(Date, nullable=False)
    period = Column(String(10), nullable=False)  # 'daily', 'weekly', 'monthly', 'ytd', 'qtd', 'itd'
    
    # Core metrics
    ttwr = Column(Numeric(10, 6))  # Time-Weighted Return
    mwrr = Column(Numeric(10, 6))  # Money-Weighted Return
    
    # Returns breakdown
    unrealized_gains = Column(Numeric(18, 4), default=0)
    realized_gains = Column(Numeric(18, 4), default=0)
    dividend_income = Column(Numeric(18, 4), default=0)
    interest_income = Column(Numeric(18, 4), default=0)
    currency_effects = Column(Numeric(18, 4), default=0)
    fees_paid = Column(Numeric(18, 4), default=0)
    total_return = Column(Numeric(18, 4), default=0)
    
    # Denormalized for performance
    beginning_value = Column(Numeric(18, 4))
    ending_value = Column(Numeric(18, 4))
    net_cash_flows = Column(Numeric(18, 4))
    
    portfolio = relationship("Portfolio")
    __table_args__ = (
        UniqueConstraint("portfolio_id", "date", "period", name="uq_portfolio_returns"),
        Index("idx_portfolio_returns_date", "portfolio_id", "date"),
    )