# api/positions_read.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from database.base import get_db
from database.position import PortfolioPositions
from api.positions_service import recompute_position

router = APIRouter(prefix="/api/positions", tags=["Positions"])



@router.post("/recompute/{account_id}/{company_id}")
def force_recompute_position(account_id: int, company_id: int, db: Session = Depends(get_db)):
    recompute_position(db, account_id, company_id)
    db.commit()
    return {"message": "recomputed", "account_id": account_id, "company_id": company_id}


@router.get("/by-account/{account_id}",
            operation_id="positions_listByAccount",
            summary="List positions by account",
            description="Returns current positions snapshot for a specific account.")
def list_positions_by_account(
    account_id: int,
    hide_zero: bool = Query(False, description="If true, hide zero-quantity positions"),
    db: Session = Depends(get_db),
):
    q = db.query(PortfolioPositions).filter(PortfolioPositions.account_id == account_id)
    if hide_zero:
        # numeric(18,8) = 0 → compare to 0 exactly is fine
        q = q.filter(PortfolioPositions.quantity != 0)
    rows = q.order_by(PortfolioPositions.company_id).all()
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