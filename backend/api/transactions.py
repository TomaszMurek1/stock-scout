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
from database.company import Company

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

# --------------------------------------------------------------------
# PATCH /transactions/{id}
# --------------------------------------------------------------------
@router.patch("/{transaction_id}")
def edit_transaction(transaction_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    Edits a transaction and keeps positions consistent.
    Example payload:
    {
      "quantity": 15,
      "price": 120
    }
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
    db.refresh(tx)
    return {"message": "Transaction updated", "id": tx.id}


# --------------------------------------------------------------------
# DELETE /transactions/{id}
# --------------------------------------------------------------------
@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """
    Deletes a transaction and reverses its effect on positions.
    """
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    reverse_transaction_from_position(db, tx)
    db.delete(tx)
    db.commit()

    return {"message": f"Transaction {transaction_id} deleted"}
