from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Numeric,
    UniqueConstraint,
    Index,
    SmallInteger,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from .base import Base


class CompanyNote(Base):
    __tablename__ = "company_notes"
    __table_args__ = (
        Index("idx_company_notes_user", "user_id"),
        Index("idx_company_notes_company", "company_id"),
        Index("idx_company_notes_status", "research_status"),
        # GIN indexes on tags + monitoring_triggers will be added in Alembic
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    company_id = Column(
        Integer,
        ForeignKey("companies.company_id", ondelete="CASCADE"),
        nullable=False,
    )

    # Text fields
    notes = Column(Text, nullable=True)
    investment_thesis = Column(Text, nullable=True)
    risk_factors = Column(Text, nullable=True)

    # JSONB fields
    monitoring_triggers = Column(JSONB, nullable=True)
    quality_metrics = Column(JSONB, nullable=True)
    target_prices = Column(JSONB, nullable=True)
    position_recommendation = Column(JSONB, nullable=True)
    next_catalyst = Column(JSONB, nullable=True)
    source_links = Column(JSONB, nullable=True)
    custom_fields = Column(JSONB, nullable=True)

    # Valuation numbers
    intrinsic_value_low = Column(Numeric(18, 4), nullable=True)
    intrinsic_value_high = Column(Numeric(18, 4), nullable=True)
    margin_of_safety = Column(Numeric(5, 2), nullable=True)

    # Classification
    research_status = Column(String(32), nullable=True)  # initial_research, deep_dive, etc.
    tags = Column(ARRAY(String), nullable=True)

    # Review pipeline
    review_schedule = Column(String(32), nullable=True)  # quarterly, annually, on_catalyst
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    next_review_due = Column(DateTime(timezone=True), nullable=True)

    # Sentiment
    sentiment_score = Column(SmallInteger, nullable=True)  # -10..+10 (enforced via CHECK in migration)
    sentiment_trend = Column(String(16), nullable=True)    # improving, deteriorating, stable

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", backref="company_notes")
    company = relationship("Company", backref="notes")

    def __repr__(self) -> str:
        return f"<CompanyNote(id={self.id}, user_id={self.user_id}, company_id={self.company_id})>"
