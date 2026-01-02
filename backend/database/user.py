from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Enum
from datetime import datetime
from .base import Base
from sqlalchemy.orm import relationship
import enum


class UserScope(str, enum.Enum):
    """User access scope levels."""
    ADMIN = "admin"
    DEMO = "demo"  # Can view everything like admin but cannot modify
    PAID_ACCESS = "paid_access"
    BASIC_ACCESS = "basic_access"
    READ_ONLY = "read_only"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scope = Column(Enum(UserScope, values_callable=lambda x: [e.value for e in x]), default=UserScope.BASIC_ACCESS, nullable=False)

    invitation_id = Column(Integer, ForeignKey("invitations.id"), nullable=True)
    invitation = relationship("Invitation", back_populates="users")

    portfolios = relationship("Portfolio", back_populates="user")
    favorite_stocks = relationship(
        "FavoriteStock", back_populates="user", cascade="all, delete-orphan"
    )
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    duration_days = Column(Integer, nullable=False)
    max_uses = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    scope = Column(Enum(UserScope, values_callable=lambda x: [e.value for e in x]), default=UserScope.BASIC_ACCESS, nullable=False)

    users = relationship("User", back_populates="invitation")
