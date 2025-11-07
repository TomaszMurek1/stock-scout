# api/transactions_transfer_cash.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from uuid import uuid4
from decimal import Decimal
from datetime import datetime

from database.account import Account
from database.base import get_db
from database.portfolio import Transaction, TransactionType, Portfolio
from services.auth.auth import get_current_user
from database.user import User
from api.valuation_materialize import materialize_day

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

class TransferCashIn(BaseModel):
    portfolio_id: int
    from_account_id: int
    to_account_id: int
    amount: Decimal
    currency: str
    currency_rate: Decimal = Decimal("1")
    timestamp: datetime
    note: str | None = None

@router.post("/transfer-cash")
def transfer_cash(
    payload: TransferCashIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # <-- add this
):
    # sanity
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(status_code=400, detail="from == to")

    pf = db.query(Portfolio).filter(Portfolio.id == payload.portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # (optional) verify both accounts belong to the same portfolio
    acc_from = db.query(Account).filter(Account.id == payload.from_account_id).first()
    acc_to   = db.query(Account).filter(Account.id == payload.to_account_id).first()
    if not acc_from or not acc_to or acc_from.portfolio_id != pf.id or acc_to.portfolio_id != pf.id:
        raise HTTPException(status_code=400, detail="Accounts must exist and belong to the portfolio")

    gid = str(uuid4())

    # OUT
    tx_out = Transaction(
        user_id=user.id,  # <-- set
        portfolio_id=pf.id,
        account_id=payload.from_account_id,
        company_id=None,
        transaction_type=TransactionType.TRANSFER_OUT,
        quantity=payload.amount,
        price=Decimal("0"),
        fee=Decimal("0"),
        total_value=Decimal("0"),
        currency=payload.currency.upper(),
        currency_rate=payload.currency_rate,
        timestamp=payload.timestamp,
        note=payload.note or "Transfer out",
        transfer_group_id=gid,
    )

    # IN
    tx_in = Transaction(
        user_id=user.id,  # <-- set
        portfolio_id=pf.id,
        account_id=payload.to_account_id,
        company_id=None,
        transaction_type=TransactionType.TRANSFER_IN,
        quantity=payload.amount,
        price=Decimal("0"),
        fee=Decimal("0"),
        total_value=Decimal("0"),
        currency=payload.currency.upper(),
        currency_rate=payload.currency_rate,
        timestamp=payload.timestamp,
        note=payload.note or "Transfer in",
        transfer_group_id=gid,
    )

    db.add_all([tx_out, tx_in])
    db.commit()
    db.refresh(tx_out)
    db.refresh(tx_in)

    # Materialize the day so charts reflect immediately
    materialize_day(portfolio_id=pf.id, as_of=payload.timestamp.date(), db=db)

    return {
        "transfer_group_id": gid,
        "out_id": tx_out.id,
        "in_id": tx_in.id,
    }
