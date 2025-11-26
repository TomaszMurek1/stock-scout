from datetime import datetime, timezone

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base


class CompanyFinancials(Base):

    __tablename__ = "company_financials"

    financials_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

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
    operating_cash_flow = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    total_equity = Column(Float, nullable=True)
    current_assets = Column(Float, nullable=True)
    current_liabilities = Column(Float, nullable=True)
    working_capital = Column(Float, nullable=True)
    analyst_price_target = Column(Float, nullable=True)

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


class CompanyFinancialHistory(Base):
    __tablename__ = "company_financial_history"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "report_end_date",
            "period_type",
            name="uq_company_hist_company_date",
        ),
        Index(
            "idx_company_hist_company_date",
            "company_id",
            "report_end_date",
            "period_type",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    report_end_date = Column(DateTime, nullable=False, index=True)
    period_type = Column(String(20), nullable=False, default="annual")
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
    operating_cash_flow = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    total_liabilities = Column(Float, nullable=True)
    total_equity = Column(Float, nullable=True)
    current_assets = Column(Float, nullable=True)
    current_liabilities = Column(Float, nullable=True)
    working_capital = Column(Float, nullable=True)
    analyst_price_target = Column(Float, nullable=True)
    last_updated = Column(
        DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )

    company = relationship("Company", back_populates="financial_history")


class CompanyRecommendationHistory(Base):
    __tablename__ = "company_recommendation_history"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "action_date",
            "firm",
            "action",
            "to_grade",
            name="uq_company_reco_unique_row",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    action_date = Column(DateTime, nullable=False, index=True)
    firm = Column(String, nullable=True)
    action = Column(String, nullable=True)
    from_grade = Column(String, nullable=True)
    to_grade = Column(String, nullable=True)
    created_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    company = relationship("Company", backref="recommendations_history")


class CompanyEstimateHistory(Base):
    __tablename__ = "company_estimate_history"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "estimate_type",
            "period_label",
            name="uq_company_estimate_unique",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    estimate_type = Column(String(20), nullable=False)  # "revenue" | "earnings" | "price_target"
    period_label = Column(String(50), nullable=False)  # e.g., currentQuarter
    average = Column(Float, nullable=True)
    low = Column(Float, nullable=True)
    high = Column(Float, nullable=True)
    number_of_analysts = Column(Integer, nullable=True)
    year_ago = Column(Float, nullable=True)
    growth = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    created_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    company = relationship("Company", backref="estimate_history")


class CompanyEpsRevisionHistory(Base):
    __tablename__ = "company_eps_revision_history"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "period_label", name="uq_company_eps_revision"
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    period_label = Column(String(50), nullable=False)
    revision_up = Column(Float, nullable=True)
    revision_down = Column(Float, nullable=True)
    created_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    company = relationship("Company", backref="eps_revisions_history")
