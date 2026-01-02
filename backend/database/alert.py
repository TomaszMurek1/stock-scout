from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLAlchemyEnum
)
from sqlalchemy.orm import relationship
import enum

from .base import Base

class AlertType(str, enum.Enum):
    PRICE_ABOVE = "PRICE_ABOVE"
    PRICE_BELOW = "PRICE_BELOW"
    PERCENT_CHANGE_UP = "PERCENT_CHANGE_UP"
    PERCENT_CHANGE_DOWN = "PERCENT_CHANGE_DOWN"
    SMA_50_ABOVE_SMA_200 = "SMA_50_ABOVE_SMA_200"
    SMA_50_BELOW_SMA_200 = "SMA_50_BELOW_SMA_200"
    SMA_50_APPROACHING_SMA_200 = "SMA_50_APPROACHING_SMA_200" # Within X% (from parameter)
    # Future types like TECHNICAL, NEWS, EARNINGS can be added here

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=True) # Nullable for generic alerts or flexibility
    ticker = Column(String, nullable=False) # Store ticker directly for easier access/display without join
    
    alert_type = Column(SQLAlchemyEnum(AlertType), nullable=False)
    threshold_value = Column(Float, nullable=False)
    
    is_active = Column(Boolean, default=True)
    is_triggered = Column(Boolean, default=False)
    last_triggered_at = Column(DateTime, nullable=True)
    
    # Notification metadata (e.g., read status, snoozed until)
    is_read = Column(Boolean, default=False)
    snoozed_until = Column(DateTime, nullable=True)
    message = Column(String, nullable=True) # Store the triggered message or custom note

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="alerts")
    company = relationship("Company")

    def __repr__(self):
        return f"<Alert(id={self.id}, user={self.user_id}, ticker={self.ticker}, type={self.alert_type}, threshold={self.threshold_value})>"
