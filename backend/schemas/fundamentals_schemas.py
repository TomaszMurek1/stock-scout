from pydantic import BaseModel
from typing import List, Optional

class EVRevenueScanRequest(BaseModel):
    min_ev_to_revenue: Optional[float] = None,
    max_ev_to_revenue: Optional[float] = None,
    markets: List[str]

class BreakEvenPointRequest(BaseModel):
    markets: List[str]