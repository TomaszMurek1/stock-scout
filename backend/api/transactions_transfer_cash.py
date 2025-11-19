# api/transactions_transfer_cash.py
"""
Transfer cash between two accounts (same or different portfolios).
Creates a TRANSFER_OUT in the source account and a TRANSFER_IN in the destination.
Also materializes valuation for the transfer date(s).
"""

from uuid import uuid4
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.account import Account
from api.valuation_materialize import materialize_day

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

CASH_PRECISION = Decimal("0.0001")


def _dec(value) -> Decimal:
    return Decimal(str(value or "0"))


def _ensure_account_currency(db: Session, account: Account, fallback: str) -> str:
    if account.currency:
        return account.currency.upper()
    account.currency = fallback.upper()
    db.flush()
    return account.currency


class TransferCashRequest(BaseModel):
    from_portfolio_id: int = Field(..., description="Source portfolio ID")
    from_account_id:  int = Field(..., description="Source account ID")
    to_portfolio_id:  int = Field(..., description="Destination portfolio ID")
    to_account_id:    int = Field(..., description="Destination account ID")

    amount: Decimal   = Field(..., gt=0, description="Amount of cash to transfer")
    currency: str     = Field(..., min_length=3, max_length=3, description="Cash currency, e.g. PLN or USD")
    currency_rate: Decimal = Field(1, description="FX rate to portfolio base (if needed)")

    timestamp: datetime | None = Field(
        None,
        description="When the transfer happened; defaults to now (UTC)."
    )
    note: str | None = Field(None, description="Optional note")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "from_portfolio_id": 2,
                    "from_account_id": 1,
                    "to_portfolio_id": 2,
                    "to_account_id": 2,
                    "amount": "5000",
                    "currency": "PLN",
                    "currency_rate": "1",
                    "timestamp": "2025-11-07T06:00:00Z",
                    "note": "Move PLN cash",
                }
            ]
        }
    }


@router.post("/transfer-cash", operation_id="transactions_transferCash")
def transfer_cash(payload: TransferCashRequest, db: Session = Depends(get_db)):
    ts = payload.timestamp or datetime.utcnow()
    gid = str(uuid4())

    # Basic existence checks
    pf_from = db.query(Portfolio).filter(Portfolio.id == payload.from_portfolio_id).first()
    pf_to   = db.query(Portfolio).filter(Portfolio.id == payload.to_portfolio_id).first()
    if not pf_from or not pf_to:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    a_from = db.query(Account).filter(Account.id == payload.from_account_id).first()
    a_to   = db.query(Account).filter(Account.id == payload.to_account_id).first()
    if not a_from or not a_to:
        raise HTTPException(status_code=404, detail="Account not found")
    if a_from.portfolio_id != payload.from_portfolio_id or a_to.portfolio_id != payload.to_portfolio_id:
        raise HTTPException(status_code=400, detail="Account does not belong to given portfolio")

    transfer_ccy = payload.currency.upper()
    from_ccy = _ensure_account_currency(db, a_from, transfer_ccy)
    to_ccy = _ensure_account_currency(db, a_to, transfer_ccy)
    if from_ccy != transfer_ccy or to_ccy != transfer_ccy:
        raise HTTPException(status_code=400, detail="Transfer currency must match source and destination account currencies")

    amount = _dec(payload.amount)
    if _dec(a_from.cash) < amount:
        raise HTTPException(status_code=400, detail="Insufficient cash in source account")

    # OUT leg
    tx_out = Transaction(
        user_id=pf_from.user_id,
        portfolio_id=payload.from_portfolio_id,
        account_id=payload.from_account_id,
        company_id=None,
        transaction_type=TransactionType.TRANSFER_OUT,
        quantity=amount,
        price=Decimal("0"),
        fee=Decimal("0"),
        total_value=Decimal("0"),
        currency=transfer_ccy,
        currency_rate=payload.currency_rate,
        timestamp=ts,
        note=payload.note,
        transfer_group_id=gid,
    )
    db.add(tx_out)

    # IN leg
    tx_in = Transaction(
        user_id=pf_from.user_id,  # same user across portfolios in your setup
        portfolio_id=payload.to_portfolio_id,
        account_id=payload.to_account_id,
        company_id=None,
        transaction_type=TransactionType.TRANSFER_IN,
        quantity=amount,
        price=Decimal("0"),
        fee=Decimal("0"),
        total_value=Decimal("0"),
        currency=transfer_ccy,
        currency_rate=payload.currency_rate,
        timestamp=ts,
        note=payload.note,
        transfer_group_id=gid,
    )
    db.add(tx_in)
    db.flush()

    a_from.cash = (_dec(a_from.cash) - amount).quantize(CASH_PRECISION)
    a_to.cash = (_dec(a_to.cash) + amount).quantize(CASH_PRECISION)
    db.flush()

    # Materialize valuation (same day) for both portfolios
    materialize_day(portfolio_id=payload.from_portfolio_id, as_of=ts.date(), db=db)
    if payload.to_portfolio_id != payload.from_portfolio_id:
        materialize_day(portfolio_id=payload.to_portfolio_id, as_of=ts.date(), db=db)

    db.commit()
    return {"transfer_group_id": gid, "out_id": tx_out.id, "in_id": tx_in.id}
