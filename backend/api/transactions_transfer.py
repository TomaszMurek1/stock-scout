# api/transactions_transfer.py
"""
Transfer a security position between two accounts.
Creates TRANSFER_OUT (source) and TRANSFER_IN (destination), updates positions,
and materializes valuation for the transfer date(s).
"""

from uuid import uuid4
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.base import get_db
from database.position import Position
from database.account import Account
from database.portfolio import Portfolio, Transaction, TransactionType
from api.positions_service import apply_transaction_to_position
from api.valuation_materialize import materialize_day

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


class TransferPositionRequest(BaseModel):
    from_portfolio_id: int
    from_account_id:  int
    to_portfolio_id:  int
    to_account_id:    int

    company_id: int
    quantity: Decimal = Field(..., gt=0)

    price_per_unit: Decimal | None = Field(None, description="Optional override; defaults to donor avg_cost")
    currency: str | None = Field(None, description="Optional override; defaults to donor avg_cost_ccy")
    currency_rate: Decimal | None = Field(None, description="Defaults to 1 if same as base")

    timestamp: datetime | None = None
    note: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "from_portfolio_id": 2,
                    "from_account_id": 1,
                    "to_portfolio_id": 2,
                    "to_account_id": 2,
                    "company_id": 4,
                    "quantity": "3",
                    "price_per_unit": "150.00",
                    "currency": "USD",
                    "currency_rate": "3.70",
                    "timestamp": "2025-11-07T08:00:00Z",
                    "note": "Move part of AAPL"
                }
            ]
        }
    }


@router.post("/transfer", operation_id="transactions_transferSecurity")
def transfer_position(payload: TransferPositionRequest, db: Session = Depends(get_db)):
    ts = payload.timestamp or datetime.utcnow()
    gid = str(uuid4())

    pf_from = db.query(Portfolio).filter(Portfolio.id == payload.from_portfolio_id).first()
    pf_to   = db.query(Portfolio).filter(Portfolio.id == payload.to_portfolio_id).first()
    if not pf_from or not pf_to:
        raise HTTPException(404, "Portfolio not found")

    a_from = db.query(Account).filter(Account.id == payload.from_account_id).first()
    a_to   = db.query(Account).filter(Account.id == payload.to_account_id).first()
    if not a_from or not a_to:
        raise HTTPException(404, "Account not found")
    if a_from.portfolio_id != payload.from_portfolio_id or a_to.portfolio_id != payload.to_portfolio_id:
        raise HTTPException(400, "Account does not belong to given portfolio")

    donor_pos = (
        db.query(Position)
        .filter(Position.account_id == payload.from_account_id, Position.company_id == payload.company_id)
        .first()
    )
    if not donor_pos or donor_pos.quantity < payload.quantity:
        raise HTTPException(400, "Insufficient quantity in source account")

    ppu = payload.price_per_unit or donor_pos.avg_cost
    ccy = (payload.currency or donor_pos.avg_cost_ccy).upper()
    rate = payload.currency_rate or Decimal("1")

    tx_out = Transaction(
        user_id=pf_from.user_id,
        portfolio_id=payload.from_portfolio_id,
        account_id=payload.from_account_id,
        company_id=payload.company_id,
        transaction_type=TransactionType.TRANSFER_OUT,
        quantity=payload.quantity,
        price=ppu,
        currency=ccy,
        currency_rate=rate,
        timestamp=ts,
        note=payload.note,
        transfer_group_id=gid,
    )
    db.add(tx_out); db.flush()
    apply_transaction_to_position(db, tx_out)

    tx_in = Transaction(
        user_id=pf_from.user_id,
        portfolio_id=payload.to_portfolio_id,
        account_id=payload.to_account_id,
        company_id=payload.company_id,
        transaction_type=TransactionType.TRANSFER_IN,
        quantity=payload.quantity,
        price=ppu,
        currency=ccy,
        currency_rate=rate,
        timestamp=ts,
        note=payload.note,
        transfer_group_id=gid,
    )
    db.add(tx_in); db.flush()
    apply_transaction_to_position(db, tx_in)

    materialize_day(portfolio_id=payload.from_portfolio_id, as_of=ts.date(), db=db)
    if payload.to_portfolio_id != payload.from_portfolio_id:
        materialize_day(portfolio_id=payload.to_portfolio_id, as_of=ts.date(), db=db)

    db.commit()
    return {"message": "transfer completed", "out_id": tx_out.id, "in_id": tx_in.id, "transfer_group_id": gid}
