from typing import Optional
from pydantic import BaseModel


class BasketOut(BaseModel):
    id: int
    name: str
    type: str
    owner_id: Optional[int] = None
    reference_id: Optional[int] = None

    class Config:
        from_attributes = True
