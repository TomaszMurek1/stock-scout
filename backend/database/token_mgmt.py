from sqlalchemy import (
    Column,
    Integer,
    String,
    Index,
    DateTime
)
from datetime import datetime
from .base import Base

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(36), nullable=False, index=True)
    revoked_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (Index('idx_revoked_jti', 'jti'),)
