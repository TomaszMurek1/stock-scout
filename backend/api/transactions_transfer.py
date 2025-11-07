# api/transactions_transfer.py  (security transfer)
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime

from database.base import get_db
from database.position import Position
from database.account import Account
from database.portfolio import Portfolio, Transaction, TransactionType
from api.positions_service import apply_transaction_to_position
from api.valuation_materialize import materialize_day

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/transfer")
def transfer_position(
    from_portfolio_id: int,
    from_account_id: int,
    to_portfolio_id: int,
    to_account_id: int,
    company_id: int,
    quantity: Decimal,
    price_per_unit: Decimal | None = None,
    currency: str | None = None,
    currency_rate: Decimal | None = None,
    timestamp: datetime | None = None,
    note: str | None = None,
    db: Session = Depends(get_db),
):
    if quantity <= 0:
        raise HTTPException(400, "quantity must be > 0")

    # Ensure portfolios & accounts exist and belong
    pf_from = db.query(Portfolio).filter(Portfolio.id == from_portfolio_id).first()
    pf_to   = db.query(Portfolio).filter(Portfolio.id == to_portfolio_id).first()
    if not pf_from or not pf_to:
        raise HTTPException(404, "portfolio(s) not found")

    a_from = db.query(Account).filter(Account.id == from_account_id).first()
    a_to   = db.query(Account).filter(Account.id == to_account_id).first()
    if not a_from or not a_to:
        raise HTTPException(404, "account(s) not found")
    if a_from.portfolio_id != from_portfolio_id or a_to.portfolio_id != to_portfolio_id:
        raise HTTPException(400, "account does not belong to given portfolio")

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
    gid = str(uuid4())

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
        transfer_group_id=gid,   # <— link legs
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
        price=price_per_unit,
        currency=currency,
        currency_rate=currency_rate,
        timestamp=ts,
        note=note,
        transfer_group_id=gid,   # <— link legs
    )
    db.add(tx_in); db.flush()
    apply_transaction_to_position(db, tx_in)

    # optional but nice: materialize valuation for that day
    materialize_day(portfolio_id=from_portfolio_id, as_of=ts.date(), db=db)
    if to_portfolio_id != from_portfolio_id:
        materialize_day(portfolio_id=to_portfolio_id, as_of=ts.date(), db=db)

    db.commit()
    return {"message": "transfer completed", "out_id": tx_out.id, "in_id": tx_in.id, "group": gid}
