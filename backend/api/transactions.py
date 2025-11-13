# api/transactions.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List
from database.base import get_db
from database.portfolio import Transaction
from api.positions_service import (
    reverse_transaction_from_position,
    apply_transaction_to_position,
)
from services.valuation.rematerializ import rematerialize_from_tx

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

# --------------------------------------------------------------------
# PATCH /transactions/{id}
# --------------------------------------------------------------------
@router.patch("/{transaction_id}",  operation_id="transaction_edit")
def edit_transaction(transaction_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    Edits a transaction and keeps positions consistent.
    """
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse current transaction from position
    reverse_transaction_from_position(db, tx)

    # Update fields dynamically
    for key, value in payload.items():
        if hasattr(tx, key):
            setattr(tx, key, value)

    db.flush()  # Persist changes

    # Re-apply new transaction effect
    apply_transaction_to_position(db, tx)
    
    db.commit()
    
    # ADD THIS: Trigger portfolio rematerialization for metrics
    rematerialize_from_tx(db, tx.portfolio_id, tx.timestamp.date())
    
    db.refresh(tx)
    return {"message": "Transaction updated", "id": tx.id}

# --------------------------------------------------------------------
# DELETE /transactions/{id}
# --------------------------------------------------------------------
@router.delete("/{transaction_id}",  operation_id="transactions_delete")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """
    Deletes a transaction and reverses its effect on positions.
    """
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    portfolio_id = tx.portfolio_id
    transaction_date = tx.timestamp.date()
    
    reverse_transaction_from_position(db, tx)
    db.delete(tx)
    db.commit()

    # ADD THIS: Trigger portfolio rematerialization for metrics
    rematerialize_from_tx(db, portfolio_id, transaction_date)

    return {"message": f"Transaction {transaction_id} deleted"}

# --------------------------------------------------------------------
# POST /transactions
# --------------------------------------------------------------------
@router.post("", status_code=201, operation_id="transactions_create")
def create_transaction(payload: dict, db: Session = Depends(get_db)):
    """
    Generic transaction creator
    """
    from datetime import datetime
    from database.portfolio import TransactionType
    from api.positions_service import apply_transaction_to_position

    required_fields = ["user_id", "portfolio_id", "account_id", "transaction_type", "quantity", "currency", "currency_rate"]
    for f in required_fields:
        if f not in payload:
            raise HTTPException(status_code=400, detail=f"Missing field: {f}")

    tx_type_str = payload["transaction_type"].upper()
    try:
        tx_type = TransactionType[tx_type_str]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid transaction_type: {tx_type_str}")

    # Optional company_id (for stock / ETF / bond transactions)
    company_id = payload.get("company_id")

    tx = Transaction(
        user_id=payload["user_id"],
        portfolio_id=payload["portfolio_id"],
        account_id=payload["account_id"],
        company_id=company_id,
        transaction_type=tx_type,
        quantity=Decimal(str(payload["quantity"])),
        price=Decimal(str(payload.get("price") or 0)),
        fee=Decimal(str(payload.get("fee") or 0)),
        total_value=Decimal(str(payload.get("total_value") or 0)),
        currency=payload["currency"].upper(),
        currency_rate=Decimal(str(payload["currency_rate"])),
        timestamp=datetime.fromisoformat(payload.get("timestamp").replace("Z", "+00:00")) if payload.get("timestamp") else datetime.utcnow(),
        note=payload.get("note"),
    )

    db.add(tx)
    db.flush()

    # Apply to position if applicable (BUY, SELL, TRANSFER_IN/OUT, DIVIDEND, INTEREST)
    apply_transaction_to_position(db, tx)

    db.commit()
    
    # ADD THIS: Trigger portfolio rematerialization for metrics
    rematerialize_from_tx(db, tx.portfolio_id, tx.timestamp.date())
    
    db.refresh(tx)
    return {"message": "Transaction created", "id": tx.id, "type": tx.transaction_type.value}
