from pydantic import BaseModel
from decimal import Decimal

class TradeRequest(BaseModel):
    company_id: int
    quantity: Decimal
    price: Decimal
