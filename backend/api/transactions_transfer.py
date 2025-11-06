# api/transactions_transfer.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from database.base import get_db
from database.position import Position
from database.portfolio import Transaction, TransactionType
from api.positions_service import apply_transaction_to_position

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/transfer")
def transfer_position(
    from_portfolio_id: int,
    from_account_id: int,
    to_portfolio_id: int,
    to_account_id: int,
    company_id: int,
    quantity: Decimal,
    price_per_unit: Decimal | None = None,  # cost basis carryover; default = donor avg_cost
    currency: str | None = None,            # instrument ccy (e.g., "USD")
    currency_rate: Decimal | None = None,   # inst_ccy -> dest base ccy
    timestamp: datetime | None = None,
    note: str | None = None,
    db: Session = Depends(get_db),
):
    if quantity <= 0:
        raise HTTPException(400, "quantity must be > 0")

    donor_pos = (
        db.query(Position)
        .filter(Position.account_id == from_account_id, Position.company_id == company_id)
        .first()
    )
    if not donor_pos or donor_pos.quantity < quantity:
        raise HTTPException(400, "insufficient quantity in source account")

    if price_per_unit is None:
        price_per_unit = donor_pos.avg_cost
    if currency is None:
        currency = donor_pos.avg_cost_ccy
    if currency_rate is None:
        currency_rate = Decimal("1")

    ts = timestamp or datetime.utcnow()

    tx_out = Transaction(
        user_id=donor_pos.account.portfolio.user_id,
        portfolio_id=from_portfolio_id,
        account_id=from_account_id,
        company_id=company_id,
        transaction_type=TransactionType.TRANSFER_OUT,
        quantity=quantity,
        price=price_per_unit,
        currency=currency,
        currency_rate=currency_rate,
        timestamp=ts,
        note=note,
    )
    db.add(tx_out); db.flush()
    apply_transaction_to_position(db, tx_out)

    tx_in = Transaction(
        user_id=donor_pos.account.portfolio.user_id,
        portfolio_id=to_portfolio_id,
        account_id=to_account_id,
        company_id=company_id,
        transaction_type=TransactionType.TRANSFER_IN,
        quantity=quantity,
        price=price_per_unit,  # carry basis
        currency=currency,
        currency_rate=currency_rate,
        timestamp=ts,
        note=note,
    )
    db.add(tx_in); db.flush()
    apply_transaction_to_position(db, tx_in)

    db.commit()
    return {"message": "transfer completed", "out_id": tx_out.id, "in_id": tx_in.id}
