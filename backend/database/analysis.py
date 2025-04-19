from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    analysis_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    market_id = Column(Integer, ForeignKey("markets.market_id"), nullable=False)

    analysis_type = Column(
        String, nullable=False
    )  # e.g., "golden_cross", "death_cross"
    short_window = Column(Integer)
    long_window = Column(Integer)
    cross_date = Column(Date, nullable=True)
    cross_price = Column(Float, nullable=True)
    days_since_cross = Column(Integer, nullable=True)

    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="analysis_results")
    market = relationship("Market", back_populates="analysis_results")
