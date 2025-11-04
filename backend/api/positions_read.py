# api/positions_read.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.base import get_db
from database.position import Position

router = APIRouter(prefix="/api/positions", tags=["positions"])

@router.get("/by-account/{account_id}")
def list_positions_by_account(account_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Position)
        .filter(Position.account_id == account_id)
        .order_by(Position.company_id)
        .all()
    )
    return [
        {
            "id": p.id,
            "account_id": p.account_id,
            "company_id": p.company_id,
            "quantity": str(p.quantity),
            "avg_cost": str(p.avg_cost),
            "avg_cost_ccy": p.avg_cost_ccy,
        }
        for p in rows
    ]
