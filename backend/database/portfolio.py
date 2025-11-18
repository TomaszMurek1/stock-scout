from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship, backref

from schemas.portfolio_schemas import TransactionType
from .base import Base



class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False, default="Default Portfolio")
    currency = Column(String(3), nullable=False, default="USD")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="portfolios")
    transactions = relationship(
        "Transaction",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )
    accounts = relationship(
        "Account",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )
    valuations = relationship("PortfolioValuationDaily", back_populates="portfolio")
    returns = relationship("PortfolioReturns", back_populates="portfolio")

    def __repr__(self):
        return f"<Portfolio(id={self.id}, name={self.name}, user_id={self.user_id})>"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=True)  # CHANGED: nullable=True

    transaction_type = Column(SQLAlchemyEnum(TransactionType, name="transactiontype"), nullable=False)
    quantity = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    price = Column(Numeric(precision=18, scale=4), nullable=True)
    fee = Column(Numeric(precision=18, scale=4), nullable=True, default=0)
    total_value = Column(Numeric(precision=18, scale=4), nullable=True)
    currency = Column(String(3), nullable=False)
    currency_rate = Column(Numeric(18, 6), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    note = Column(String(500), nullable=True)
    transfer_group_id = Column(String(36), nullable=True, index=True)
    
    user = relationship("User")
    portfolio = relationship("Portfolio", back_populates="transactions")
    company = relationship("Company", backref=backref("transactions", lazy="dynamic"))
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    account = relationship("Account")

    # Helper properties
    @property
    def is_external_cash_flow(self):
        """Identify transactions that represent external money moving in/out of portfolio"""
        external_types = {
            TransactionType.DEPOSIT,    # Money IN
            TransactionType.WITHDRAWAL, # Money OUT  
            TransactionType.FEE,        # Money OUT
            TransactionType.TAX,        # Money OUT
            TransactionType.DIVIDEND,   # Money IN (from external source)
            TransactionType.INTEREST    # Money IN (from external source)
        }
        return self.transaction_type in external_types

    @property
    def is_internal_transfer(self):
        """Identify transactions that move money within portfolio"""
        internal_types = {
            TransactionType.BUY,
            TransactionType.SELL,
            TransactionType.TRANSFER_IN,
            TransactionType.TRANSFER_OUT
        }
        return self.transaction_type in internal_types

    @property
    def cash_flow_amount_base(self):
        """Get the cash flow amount in base currency for external flows"""
        if not self.is_external_cash_flow:
            return 0
            
        amount = self.quantity * self.currency_rate
        # Withdrawals, fees, and taxes are negative cash flows
        if self.transaction_type in [TransactionType.WITHDRAWAL, TransactionType.FEE, TransactionType.TAX]:
            amount = -amount
            
        return amount

    def __repr__(self):
        return (
            f"<Transaction(id={self.id}, type={self.transaction_type}, "
            f"user_id={self.user_id}, fee={self.fee})>"
        )

class FavoriteStock(Base):
    __tablename__ = "favorite_stocks"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "company_id", name="uq_favorite_stocks_user_company"
        ),
        Index("idx_favorite_stocks_user", "user_id"),
        Index("idx_favorite_stocks_company", "company_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="favorite_stocks")
    company = relationship("Company")

    def __repr__(self):
        return (
            f"<FavoriteStock(id={self.id}, user_id={self.user_id}, "
            f"company_id={self.company_id})>" 
        )