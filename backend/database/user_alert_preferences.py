"""
User alert preferences for automatic SMA monitoring.

Stores per-user toggle flags for SMA-based alerts that apply
to all holdings and watchlist tickers.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base


class UserAlertPreferences(Base):
    __tablename__ = "user_alert_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # SMA crossover toggles — separate above / below
    sma50_cross_above = Column(Boolean, default=False, nullable=False)   # price crosses above SMA 50
    sma50_cross_below = Column(Boolean, default=False, nullable=False)   # price drops below SMA 50
    sma200_cross_above = Column(Boolean, default=False, nullable=False)  # price crosses above SMA 200
    sma200_cross_below = Column(Boolean, default=False, nullable=False)  # price drops below SMA 200

    # SMA distance toggles (25% and 50%)
    sma50_distance_25 = Column(Boolean, default=False, nullable=False)   # price ≥25% from SMA 50
    sma50_distance_50 = Column(Boolean, default=False, nullable=False)   # price ≥50% from SMA 50
    sma200_distance_25 = Column(Boolean, default=False, nullable=False)  # price ≥25% from SMA 200
    sma200_distance_50 = Column(Boolean, default=False, nullable=False)  # price ≥50% from SMA 200

    # Deduplication: JSON string mapping "TICKER_condition" -> "YYYY-MM-DD"
    # Prevents re-sending the same alert every cron cycle
    last_sma_alerts_sent = Column(Text, default="{}", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="alert_preferences")

    def __repr__(self):
        return f"<UserAlertPreferences(user_id={self.user_id})>"
