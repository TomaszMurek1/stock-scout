from datetime import datetime
from sqlalchemy import Column, DateTime, Float,  ForeignKey, Integer, Numeric, String, func
from sqlalchemy import Enum as SQLAlchemyEnum
from enum import Enum as PyEnum
from sqlalchemy.orm import relationship, backref
from .base import Base

class TransactionType(PyEnum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    DIVIDEND = "dividend"
    INTEREST = "interest"

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False, default="Default Portfolio")
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="portfolios")
    positions = relationship("PortfolioPosition", back_populates="portfolio")
    transactions = relationship("Transaction", back_populates="portfolio")

    def __repr__(self):
        return f"<Portfolio(id={self.id}, name={self.name}, user_id={self.user_id})>"


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    # For simplicity, store total shares and average cost. 
    # You can also store the cost basis or other fields as needed.
    quantity = Column(Numeric(precision=18, scale=4), nullable=False, default=0)
    average_cost = Column(Numeric(precision=18, scale=4), nullable=False, default=0)

    portfolio = relationship("Portfolio", back_populates="positions")
    company = relationship("Company")

    def __repr__(self):
        return f"<PortfolioPosition(id={self.id}, portfolio_id={self.portfolio_id}, stock_id={self.stock_id})>"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)

    # If the transaction is deposit/withdrawal, stock_id can be None.
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    transaction_type = Column(SQLAlchemyEnum(TransactionType), nullable=False)
    # quantity can be used both for shares (buy/sell) or cash amount (deposit/withdrawal/dividends).
    quantity = Column(Numeric(precision=18, scale=4), nullable=False, default=0)

    # For buy/sell, price is the per-share cost. For deposit/withdrawal, you might set price=1 or just store the total in `quantity`.
    price = Column(Numeric(precision=18, scale=4), nullable=True)

    total_value = Column(Numeric(precision=18, scale=4), nullable=True)

    timestamp = Column(DateTime, default=func.now(), nullable=False)
    note = Column(String(500), nullable=True)

    user = relationship("User")
    portfolio = relationship("Portfolio", back_populates="transactions")
    company = relationship("Company", backref=backref("transactions", lazy="dynamic"))

    def __repr__(self):
        return f"<Transaction(id={self.id}, type={self.transaction_type}, user_id={self.user_id})>"


# 6. (Optional) CashBalance Table
#    If you want to maintain a separate ledger or keep track of daily cash balances, interest credited, etc.
class CashBalance(Base):
    __tablename__ = "cash_balances"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    balance = Column(Numeric(precision=18, scale=2), nullable=False, default=0)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # For convenience: Relationship to the portfolio
    portfolio = relationship("Portfolio")

    def __repr__(self):
        return f"<CashBalance(portfolio_id={self.portfolio_id}, balance={self.balance})>"
    
class FavoriteStock(Base):
    __tablename__ = "favorite_stocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # references user table
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False) 

    user = relationship("User", back_populates="favorite_stocks") 
    company = relationship("Company")
    
class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)


    shares = Column(Float, default=0.0)
    average_price = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="portfolio_positions")