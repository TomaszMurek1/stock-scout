from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship, backref

from .base import Base

#old one
class TransactionType(PyEnum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    DIVIDEND = "dividend"
    INTEREST = "interest"

# new one
class TxType(PyEnum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    DIVIDEND = "dividend"
    INTEREST = "interest"     # cash/bonds
    FEE = "fee"
    TAX = "tax"
    TRANSFER_IN = "transfer_in"
    TRANSFER_OUT ="transfer_out"

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
    positions = relationship(
        "PortfolioPosition",
        back_populates="portfolio",
        cascade="all, delete-orphan",
    )
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

    def __repr__(self):
        return f"<Portfolio(id={self.id}, name={self.name}, user_id={self.user_id})>"


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"
    __table_args__ = (
        UniqueConstraint(
            "portfolio_id",
            "company_id",
            name="uq_portfolio_positions_portfolio_company",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    quantity = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    average_cost = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    portfolio = relationship("Portfolio", back_populates="positions")
    company = relationship("Company")

    def __repr__(self):
        return (
            f"<PortfolioPosition("
            f"id={self.id}, portfolio_id={self.portfolio_id}, company_id={self.company_id}"
            f")>"
        )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    transaction_type = Column(SQLAlchemyEnum(TransactionType), nullable=False)
    quantity = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    price = Column(Numeric(precision=18, scale=4), nullable=True)
    fee = Column(Numeric(precision=18, scale=4), nullable=True, default=0)
    total_value = Column(Numeric(precision=18, scale=4), nullable=True)
    currency = Column(String(3), nullable=False)
    currency_rate = Column(Numeric(18, 6), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    note = Column(String(500), nullable=True)

    user = relationship("User")
    portfolio = relationship("Portfolio", back_populates="transactions")
    company = relationship("Company", backref=backref("transactions", lazy="dynamic"))
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    account = relationship("Account")


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
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="favorite_stocks")
    company = relationship("Company")
    accounts = relationship(
    "Account",
    back_populates="portfolio",
    cascade="all, delete-orphan",
)

    def __repr__(self):
        return (
            f"<FavoriteStock(id={self.id}, user_id={self.user_id}, "
            f"company_id={self.company_id})>"
        )
