from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database.base import Base

class PortfolioPositions(Base):
    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint("account_id", "company_id", name="uq_position_account_company"),
    )

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False, index=True)

    # Total number of shares/units currently held
    quantity = Column(Numeric(18, 8), nullable=False, default=0)

    # --- Instrument-currency cost basis (e.g. USD if stock trades in USD) ---
    avg_cost_instrument_ccy = Column(
        Numeric(18, 8), nullable=False, default=0
    )  # per unit, in instrument currency
    instrument_currency_code = Column(
        String(3), nullable=False
    )  # e.g. "USD"

    # --- Portfolio-currency cost basis (e.g. PLN if portfolio is in PLN) ---
    avg_cost_portfolio_ccy = Column(
        Numeric(18, 8), nullable=False, default=0
    )  # per unit, in portfolio base currency
    total_cost_instrument_ccy = Column(
        Numeric(20, 4), nullable=False, default=0
    )  # quantity * avg_cost_instrument_ccy
    total_cost_portfolio_ccy = Column(
        Numeric(20, 4), nullable=False, default=0
    )  # quantity * avg_cost_portfolio_ccy

    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    account = relationship("Account")
    company = relationship("Company")