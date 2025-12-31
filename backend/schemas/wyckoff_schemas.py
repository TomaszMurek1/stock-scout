from pydantic import BaseModel, Field
from typing import List, Optional


class WyckoffWeights(BaseModel):
    """Custom weights for Wyckoff criteria (must sum to 100)."""
    trading_range: float = Field(default=25.0, ge=0, le=100, description="Weight for Trading Range criterion")
    volume_pattern: float = Field(default=25.0, ge=0, le=100, description="Weight for Volume Pattern criterion")
    spring: float = Field(default=20.0, ge=0, le=100, description="Weight for Spring criterion")
    support_tests: float = Field(default=15.0, ge=0, le=100, description="Weight for Support Tests criterion")
    signs_of_strength: float = Field(default=15.0, ge=0, le=100, description="Weight for Signs of Strength criterion")


class WyckoffRequest(BaseModel):
    """Request schema for Wyckoff accumulation scanner."""
    lookback_days: int = Field(default=90, ge=30, le=365, description="Days to analyze for accumulation patterns")
    basket_ids: Optional[List[int]] = Field(default=None, description="Basket IDs to scan")
    markets: Optional[List[str]] = Field(default=None, description="Market names to scan")
    min_market_cap: Optional[float] = Field(default=None, ge=0, description="Minimum market cap in millions USD")
    min_score: float = Field(default=60.0, ge=0, le=100, description="Minimum overall score to display results")
    weights: Optional[WyckoffWeights] = Field(default=None, description="Custom weights for criteria (must sum to 100)")


class WyckoffScore(BaseModel):
    """Individual criterion score with narrative."""
    criterion: str = Field(description="Name of the criterion (e.g., 'Trading Range')")
    score: float = Field(ge=0, le=100, description="Score from 0-100")
    narrative: str = Field(description="Evidence-based explanation of the score")
    
    
class WyckoffResult(BaseModel):
    """Complete Wyckoff analysis result for a single stock."""
    ticker: str
    name: str
    overall_score: float = Field(ge=0, le=100, description="Weighted average of all criterion scores")
    scores: List[WyckoffScore] = Field(description="Individual criterion scores")
    current_price: float
    range_low: Optional[float] = Field(None, description="Support level of trading range")
    range_high: Optional[float] = Field(None, description="Resistance level of trading range")
    phase_detected: Optional[str] = Field(None, description="Wyckoff phase (e.g., 'Phase B', 'Phase C')")
    chart_data: List[dict] = Field(description="OHLCV data for visualization")
