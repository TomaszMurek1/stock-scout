from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database.base import Base  # adjust import to your Base location

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)

    name = Column(String(100), nullable=False)           # e.g. "Broker A", "Bank PLN", "Binance"
    account_type = Column(String(30), nullable=False)    # "brokerage" | "bank" | "wallet" (free text OK for now)
    currency = Column(String(3), nullable=True)          # useful for bank accounts; can be NULL otherwise
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    portfolio = relationship("Portfolio", back_populates="accounts")
