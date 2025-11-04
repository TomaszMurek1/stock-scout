from datetime import datetime, timezone
from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
from .base import Base


class CompanyFinancials(Base):

    __tablename__ = "company_financials"

    financials_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.market_id"), nullable=False)

    enterprise_value = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    net_income = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    ebit = Column(Float, nullable=True)
    diluted_eps = Column(Float, nullable=True)
    basic_eps = Column(Float, nullable=True)
    gross_profit = Column(Float, nullable=True)
    operating_income = Column(Float, nullable=True)
    interest_income = Column(Float, nullable=True)
    interest_expense = Column(Float, nullable=True)
    depreciation_amortization = Column(Float, nullable=True)
    free_cash_flow = Column(Float, nullable=True)
    capital_expenditure = Column(Float, nullable=True)
    total_debt = Column(Float, nullable=True)
    cash_and_cash_equivalents = Column(Float, nullable=True)
    shares_outstanding = Column(BigInteger, nullable=True)

    last_fiscal_year_end = Column(DateTime, nullable=True)
    most_recent_report = Column(DateTime, nullable=True)
    current_price = Column(Float, nullable=True)
    dividends_paid = Column(Float, nullable=True)

    last_updated = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company = relationship("Company", back_populates="financials")
    market = relationship("Market", back_populates="financials")


class CompanyFinancialHistory(Base):
    __tablename__ = "company_financial_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.market_id"), nullable=False)
    report_end_date = Column(DateTime, nullable=False, index=True)
    net_income = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    ebitda = Column(Float, nullable=True)
    ebit = Column(Float, nullable=True)
    diluted_eps = Column(Float, nullable=True)
    basic_eps = Column(Float, nullable=True)
    operating_income = Column(Float, nullable=True)
    free_cash_flow = Column(Float, nullable=True)
    capital_expenditure = Column(Float, nullable=True)
    interest_expense = Column(Float, nullable=True)
    interest_income = Column(Float, nullable=True)
    depreciation_amortization = Column(Float, nullable=True)
    enterprise_value = Column(Float, nullable=True)
    gross_profit = Column(Float, nullable=True)
    earnings_growth = Column(Float, nullable=True)
    revenue_growth = Column(Float, nullable=True)
    total_debt = Column(Float, nullable=True)
    cash_and_cash_equivalents = Column(Float, nullable=True)
    shares_outstanding = Column(BigInteger, nullable=True)
    dividends_paid = Column(Float, nullable=True)
    last_updated = Column(
        DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )

    company = relationship("Company", back_populates="financial_history")
    market = relationship("Market", back_populates="financial_history")
