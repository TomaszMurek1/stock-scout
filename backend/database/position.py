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


class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint("account_id", "company_id", name="uq_position_account_company"),
    )

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False, index=True)

    quantity = Column(Numeric(18, 8), nullable=False, default=0)
    avg_cost = Column(Numeric(18, 8), nullable=False, default=0)  # per unit, in avg_cost_ccy
    avg_cost_ccy = Column(String(3), nullable=False)              # e.g. "USD"
    last_updated = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    account = relationship("Account")
    company = relationship("Company")
