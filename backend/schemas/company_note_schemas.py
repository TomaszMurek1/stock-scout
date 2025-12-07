from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Base Schema
class CompanyNoteBase(BaseModel):
    title: Optional[str] = None  # Maps to 'notes' column
    research_status: Optional[str] = "inbox"
    sentiment: Optional[str] = "neutral"  # Maps to 'sentiment_trend'
    thesis: Optional[str] = None  # Maps to 'investment_thesis'
    risk_factors: Optional[str] = None  # Maps to 'risk_factors'
    target_price_low: Optional[float] = None  # Maps to 'intrinsic_value_low'
    target_price_high: Optional[float] = None  # Maps to 'intrinsic_value_high'
    next_catalyst: Optional[str] = None  # Maps to 'next_catalyst' JSON field key 'event'
    tags: Optional[List[str]] = []

# Schema for creating a note (Input)
class CompanyNoteCreate(CompanyNoteBase):
    pass

# Schema for updating a note (Input)
class CompanyNoteUpdate(CompanyNoteBase):
    pass

# Schema for reading a note (Output)
class CompanyNoteResponse(CompanyNoteBase):
    id: int
    ticker: str
    updated_at: datetime

    class Config:
        from_attributes = True
