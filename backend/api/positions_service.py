# api/positions_service.py
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.portfolio import Transaction, TransactionType
from database.account import Account
from database.company import Company
from database.position import Position  # you created this model earlier


def get_default_account_id(db: Session, portfolio_id: int) -> int:
    # Reuse seeded “Default” account
    acc_id = (
        db.query(Account.id)
        .filter(Account.portfolio_id == portfolio_id, Account.name == "Default")
        .scalar()
    )
    if not acc_id:
        # Fallback: create it if missing (shouldn't happen, but safe)
        acc = Account(portfolio_id=portfolio_id, name="Default", account_type="brokerage")
        db.add(acc)
        db.flush()
        acc_id = acc.id
    return acc_id


def apply_transaction_to_position(db: Session, tx: Transaction) -> None:
    """
    Update Position for (account_id, company_id) after a single transaction.
    Rules:
      - BUY  : increase qty, recalc weighted avg_cost (per share) in tx.currency
      - SELL : decrease qty, avg_cost unchanged (unless quantity becomes 0 -> reset avg_cost=0)
      - Other tx types (DEPOSIT/WITHDRAWAL/DIVIDEND/INTEREST/FEE/TAX) do NOT change equity positions.
        (They affect cash positions, which we’ll add once cash is an Instrument.)
    """
    # Ensure account_id present (older code paths might not set it yet)
    if not tx.account_id:
        tx.account_id = get_default_account_id(db, tx.portfolio_id)

    # Div/Interest/Fee/Tax/Deposit/Withdrawal do not change share quantity for a company security
    if tx.transaction_type not in (TransactionType.BUY, TransactionType.SELL):
        return

    pos = (
        db.query(Position)
        .filter(Position.account_id == tx.account_id, Position.company_id == tx.company_id)
        .first()
    )

    if not pos:
        # Create empty position for this (account, company)
        pos = Position(
            account_id=tx.account_id,
            company_id=tx.company_id,
            quantity=Decimal("0"),
            avg_cost=Decimal("0"),
            avg_cost_ccy=tx.currency,  # store tx currency as cost currency
        )
        db.add(pos)
        db.flush()

    qty = Decimal(str(pos.quantity))
    avg = Decimal(str(pos.avg_cost))
    q_tx = Decimal(str(tx.quantity))
    p_tx = Decimal(str(tx.price or 0))
    # NOTE: fee is ignored for avg_cost here; you may choose to include fee into cost basis if desired.

    if tx.transaction_type == TransactionType.BUY:
        new_qty = qty + q_tx
        if new_qty > 0:
            # Weighted average cost per share
            new_avg = ((qty * avg) + (q_tx * p_tx)) / new_qty
        else:
            new_avg = Decimal("0")
        pos.quantity = new_qty
        pos.avg_cost = new_avg
        pos.avg_cost_ccy = tx.currency  # keep last buy currency as cost currency

    elif tx.transaction_type == TransactionType.SELL:
        new_qty = qty - q_tx
        if new_qty <= 0:
            # Flat close
            pos.quantity = Decimal("0")
            pos.avg_cost = Decimal("0")
        else:
            pos.quantity = new_qty
            # avg_cost unchanged on sells

    # last_updated handled by DB default/onupdate if set, or leave as-is.
    db.flush()


def reverse_transaction_from_position(db: Session, tx: Transaction) -> None:
    """
    Apply inverse of a transaction to the position (for deletes or edits).
    """
    # Ensure account_id present
    if not tx.account_id:
        tx.account_id = get_default_account_id(db, tx.portfolio_id)

    if tx.transaction_type not in (TransactionType.BUY, TransactionType.SELL):
        return

    pos = (
        db.query(Position)
        .filter(Position.account_id == tx.account_id, Position.company_id == tx.company_id)
        .first()
    )
    if not pos:
        return  # nothing to reverse

    qty = Decimal(str(pos.quantity))
    avg = Decimal(str(pos.avg_cost))
    q_tx = Decimal(str(tx.quantity))
    p_tx = Decimal(str(tx.price or 0))

    if tx.transaction_type == TransactionType.BUY:
        # inverse of buy = remove shares that were added
        new_qty = qty - q_tx
        if new_qty <= 0:
            pos.quantity = Decimal("0")
            pos.avg_cost = Decimal("0")
        else:
            # Recompute avg cost by removing the lot’s contribution:
            # new_avg = (qty*avg - q_tx*p_tx) / new_qty  (guard negative/div0)
            numerator = (qty * avg) - (q_tx * p_tx)
            pos.avg_cost = numerator / new_qty if new_qty != 0 else Decimal("0")
            pos.quantity = new_qty

    elif tx.transaction_type == TransactionType.SELL:
        # inverse of sell = add back shares that were removed
        new_qty = qty + q_tx
        # avg cost after reversing a sell should remain the same as before the sell (we don't know that easily),
        # but best effort: leave avg as-is; more robust is a recompute (see recompute_position below).
        pos.quantity = new_qty

    db.flush()


def recompute_position(db: Session, account_id: int, company_id: int) -> None:
    """
    Full recompute of a single (account, company) position from transactions.
    Use this if you ever need to guarantee correctness after multiple edits.
    """
    from decimal import Decimal
    qty = Decimal("0")
    cost = Decimal("0")  # total cost value = sum(q*price) for buys

    rows = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id, Transaction.company_id == company_id)
        .order_by(Transaction.timestamp.asc())
        .all()
    )

    last_ccy = None
    for t in rows:
        last_ccy = t.currency or last_ccy
        if t.transaction_type == TransactionType.BUY:
            qty += Decimal(str(t.quantity))
            cost += Decimal(str(t.quantity)) * Decimal(str(t.price or 0))
        elif t.transaction_type == TransactionType.SELL:
            qty -= Decimal(str(t.quantity))
            # avg cost unchanged; P&L realized elsewhere

    pos = (
        db.query(Position)
        .filter(Position.account_id == account_id, Position.company_id == company_id)
        .first()
    )
    if not pos:
        pos = Position(
            account_id=account_id,
            company_id=company_id,
            quantity=Decimal("0"),
            avg_cost=Decimal("0"),
            avg_cost_ccy=last_ccy or "USD",
        )
        db.add(pos)

    pos.quantity = qty if qty > 0 else Decimal("0")
    pos.avg_cost = (cost / qty) if qty > 0 else Decimal("0")
    if last_ccy:
        pos.avg_cost_ccy = last_ccy
    db.flush()
