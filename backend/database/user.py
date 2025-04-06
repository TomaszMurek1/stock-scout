from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from datetime import datetime, timezone
from .base import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    invitation_id = Column(Integer, ForeignKey("invitations.id"), nullable=True)
    invitation = relationship("Invitation", back_populates="users")

    portfolios = relationship("Portfolio", back_populates="user")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True, nullable=False)
    duration_days = Column(Integer, nullable=False)
    max_uses = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="invitation")