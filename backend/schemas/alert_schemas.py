from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from database.alert import AlertType

class AlertBase(BaseModel):
    ticker: str
    alert_type: AlertType
    threshold_value: float
    message: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_read: Optional[bool] = None
    snoozed_until: Optional[datetime] = None
    threshold_value: Optional[float] = None
    message: Optional[str] = None

class AlertResponse(AlertBase):
    id: int
    user_id: int
    company_id: Optional[int]
    is_active: bool
    is_triggered: bool
    last_triggered_at: Optional[datetime]
    is_read: bool
    snoozed_until: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
