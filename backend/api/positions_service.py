# api/positions_service.py
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.portfolio import Portfolio, Transaction
from database.account import Account
from database.company import Company
from database.position import PortfolioPositions
from schemas.portfolio_schemas import TransactionType  # you created this model earlier


def get_default_account_id(db: Session, portfolio_id: int) -> int:
    account = (
        db.query(Account)
        .filter(Account.portfolio_id == portfolio_id, Account.name == "Default")
        .first()
    )
    if account:
        return account.id

    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    currency = portfolio.currency if portfolio else None
    acc = Account(
        portfolio_id=portfolio_id,
        name="Default",
        account_type="brokerage",
        currency=currency,
    )
    db.add(acc)
    db.flush()
    return acc.id


def _dec(x) -> Decimal:
    return Decimal(str(x or "0"))


def apply_transaction_to_position(db: Session, tx: Transaction) -> None:
    """
    Update PortfolioPositions for a BUY or SELL transaction.

    BUY:
        - Increases quantity
        - Recomputes weighted-average cost
        - Tracks cost in BOTH instrument currency and portfolio currency
        - Adds fee to the *portfolio currency* cost basis

    SELL:
        - Decreases quantity
        - Removes proportional cost
        - Resets cost basis if quantity goes to zero

    NON-BUY/SELL (DIVIDEND, INTEREST, FEE, TAX, DEPOSIT, WITHDRAWAL):
        - Do NOT modify equity positions.
        - (These affect portfolio cash & PVD, not positions.)
    """

    # Only BUY/SELL modify equity positions
    if tx.transaction_type not in (TransactionType.BUY, TransactionType.SELL):
        return

    # Make sure account_id exists (older requests may not set it)
    if not tx.account_id:
        tx.account_id = get_default_account_id(db, tx.portfolio_id)

    # Portfolio base currency (e.g. PLN)
    portfolio = db.query(Portfolio).filter(Portfolio.id == tx.portfolio_id).first()
    base_ccy = (portfolio.currency or "USD").upper()

    tx_ccy = (tx.currency or base_ccy).upper()

    # FX: transaction currency -> portfolio base currency
    if tx_ccy == base_ccy:
        fx_to_base = Decimal("1")
    else:
        fx_to_base = _dec(tx.currency_rate or 1)

    # Retrieve or create position for (account_id, company_id)
    pos = (
        db.query(PortfolioPositions)
        .filter(
            PortfolioPositions.account_id == tx.account_id,
            PortfolioPositions.company_id == tx.company_id,
        )
        .first()
    )

    if not pos:
        pos = PortfolioPositions(
            account_id=tx.account_id,
            company_id=tx.company_id,
            quantity=Decimal("0"),
            avg_cost_instrument_ccy=Decimal("0"),
            instrument_currency_code=tx_ccy,
            avg_cost_portfolio_ccy=Decimal("0"),
            total_cost_instrument_ccy=Decimal("0"),
            total_cost_portfolio_ccy=Decimal("0"),
        )
        db.add(pos)
        db.flush()

    # Existing values
    qty_old = _dec(pos.quantity)
    avg_inst_old = _dec(pos.avg_cost_instrument_ccy)
    avg_base_old = _dec(pos.avg_cost_portfolio_ccy)
    total_inst_old = _dec(pos.total_cost_instrument_ccy)
    total_base_old = _dec(pos.total_cost_portfolio_ccy)

    # Transaction values
    qty_tx = _dec(tx.quantity)
    price_tx = _dec(tx.price)
    fee_tx = _dec(tx.fee)

    # ---------------------------------------------------
    # BUY
    # ---------------------------------------------------
    if tx.transaction_type == TransactionType.BUY:
        new_qty = qty_old + qty_tx

        # cost of this transaction in instrument currency
        lot_cost_inst = qty_tx * price_tx

        # cost of this transaction in portfolio currency (fee belongs here)
        lot_cost_base = (qty_tx * price_tx + fee_tx) * fx_to_base

        total_inst_new = total_inst_old + lot_cost_inst
        total_base_new = total_base_old + lot_cost_base

        if new_qty > 0:
            new_avg_inst = total_inst_new / new_qty
            new_avg_base = total_base_new / new_qty
        else:
            new_avg_inst = Decimal("0")
            new_avg_base = Decimal("0")

        # Save updates
        pos.quantity = new_qty
        pos.instrument_currency_code = tx_ccy
        pos.avg_cost_instrument_ccy = new_avg_inst
        pos.avg_cost_portfolio_ccy = new_avg_base
        pos.total_cost_instrument_ccy = total_inst_new
        pos.total_cost_portfolio_ccy = total_base_new

    # ---------------------------------------------------
    # SELL
    # ---------------------------------------------------
    elif tx.transaction_type == TransactionType.SELL:
        new_qty = qty_old - qty_tx

        # If fully sold, reset fields
        if new_qty <= 0:
            pos.quantity = Decimal("0")
            pos.avg_cost_instrument_ccy = Decimal("0")
            pos.avg_cost_portfolio_ccy = Decimal("0")
            pos.total_cost_instrument_ccy = Decimal("0")
            pos.total_cost_portfolio_ccy = Decimal("0")
        else:
            # Reduce total cost proportionally
            pos.quantity = new_qty
            pos.avg_cost_instrument_ccy = avg_inst_old
            pos.avg_cost_portfolio_ccy = avg_base_old
            pos.total_cost_instrument_ccy = new_qty * avg_inst_old
            pos.total_cost_portfolio_ccy = new_qty * avg_base_old
            # NOTE: Realized PnL is handled elsewhere.

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
        db.query(PortfolioPositions)
        .filter(PortfolioPositions.account_id == tx.account_id, PortfolioPositions.company_id == tx.company_id)
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
    Full recompute of a single (account, company) position from scratch.

    Logic is equivalent to:
      - start with empty position
      - replay all BUY/SELL transactions in chronological order
      - apply FX and fees like in apply_transaction_to_position()

    Computes:
      - quantity
      - avg_cost_instrument_ccy
      - avg_cost_portfolio_ccy
      - total_cost_instrument_ccy
      - total_cost_portfolio_ccy
      - instrument_currency_code

    Ignores non-BUY/SELL transactions (DIVIDEND, INTEREST, etc.).
    """

    # ---- 1) Get portfolio base currency (e.g. "PLN" / "USD") ----
    portfolio_id = (
        db.query(Transaction.portfolio_id)
        .filter(
            Transaction.account_id == account_id,
            Transaction.company_id == company_id,
        )
        .order_by(Transaction.timestamp.asc())
        .limit(1)
        .scalar()
    )

    if portfolio_id is not None:
        base_ccy = (
            db.query(Portfolio.currency)
            .filter(Portfolio.id == portfolio_id)
            .scalar()
            or "USD"
        ).upper()
    else:
        # No transactions at all → fall back to default
        base_ccy = "USD"

    # ---- 2) Load all transactions for this (account, company) ----
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.account_id == account_id,
            Transaction.company_id == company_id,
        )
        .order_by(Transaction.timestamp.asc())
        .all()
    )

    qty = Decimal("0")
    total_cost_inst = Decimal("0")
    total_cost_base = Decimal("0")
    last_inst_ccy = None

    for tx in txs:
        if tx.transaction_type not in (TransactionType.BUY, TransactionType.SELL):
            # non-BUY/SELL do not change the equity position itself
            continue

        tx_qty = _dec(tx.quantity)
        tx_price = _dec(tx.price)
        tx_fee = _dec(tx.fee)
        tx_ccy = (tx.currency or base_ccy).upper()

        # FX: transaction currency -> portfolio base currency
        if tx_ccy == base_ccy:
            fx_to_base = Decimal("1")
        else:
            fx_to_base = _dec(tx.currency_rate or 1)

        if tx.transaction_type == TransactionType.BUY:
            # --- BUY ---
            last_inst_ccy = tx_ccy

            lot_cost_inst = tx_qty * tx_price
            lot_cost_base = (tx_qty * tx_price + tx_fee) * fx_to_base

            qty += tx_qty
            total_cost_inst += lot_cost_inst
            total_cost_base += lot_cost_base

        elif tx.transaction_type == TransactionType.SELL:
            # --- SELL ---
            if qty <= 0:
                # Defensive: if we somehow have sells without prior buys
                qty = Decimal("0")
                total_cost_inst = Decimal("0")
                total_cost_base = Decimal("0")
            else:
                new_qty = qty - tx_qty

                if new_qty <= 0:
                    # full close
                    qty = Decimal("0")
                    total_cost_inst = Decimal("0")
                    total_cost_base = Decimal("0")
                else:
                    # scale cost proportionally to remaining quantity
                    ratio = new_qty / qty
                    qty = new_qty
                    total_cost_inst = total_cost_inst * ratio
                    total_cost_base = total_cost_base * ratio

    # ---- 3) Upsert PortfolioPositions row ----
    pos = (
        db.query(PortfolioPositions)
        .filter(
            PortfolioPositions.account_id == account_id,
            PortfolioPositions.company_id == company_id,
        )
        .first()
    )

    if not pos:
        pos = PortfolioPositions(
            account_id=account_id,
            company_id=company_id,
        )
        db.add(pos)

    # If quantity is zero → reset basis fields
    if qty <= 0:
        pos.quantity = Decimal("0")
        pos.avg_cost_instrument_ccy = Decimal("0")
        pos.avg_cost_portfolio_ccy = Decimal("0")
        pos.total_cost_instrument_ccy = Decimal("0")
        pos.total_cost_portfolio_ccy = Decimal("0")
        pos.instrument_currency_code = last_inst_ccy or base_ccy

    else:
        pos.quantity = qty
        pos.total_cost_instrument_ccy = total_cost_inst
        pos.total_cost_portfolio_ccy = total_cost_base
        pos.avg_cost_instrument_ccy = (
            total_cost_inst / qty if qty > 0 else Decimal("0")
        )
        pos.avg_cost_portfolio_ccy = (
            total_cost_base / qty if qty > 0 else Decimal("0")
        )
        pos.instrument_currency_code = last_inst_ccy or base_ccy

    db.flush()


def recompute_account_cash(db: Session, account_id: int) -> None:
    """
    Sum all cash-impacting transactions for this account and update Account.cash.
    Handles multi-currency by converting to Account currency.
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return

    account_ccy = (account.currency or "PLN").upper()
    
    # Get all transactions for this account
    txs = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id)
        .all()
    )
    
    cash_balance = Decimal("0")
    
    for tx in txs:
        tx_ccy = (tx.currency or account_ccy).upper()
        
        # FX Rate: tx_ccy -> account_ccy
        # If transaction stores a rate, valid ONLY if it converts TO the portfolio/account base.
        # Assuming tx.currency_rate is always "How many AccountCCY for 1 TxCCY".
        # If tx_ccy == account_ccy, rate is 1.
        
        if tx_ccy == account_ccy:
            rate = Decimal("1")
        else:
            rate = _dec(tx.currency_rate or 1)
            
        qty = _dec(tx.quantity)
        price = _dec(tx.price or 0)
        fee = _dec(tx.fee or 0)
        
        # Cash Impact Logic
        impact = Decimal("0")
        
        if tx.transaction_type == TransactionType.DEPOSIT:
            impact = qty # Cash IN
        elif tx.transaction_type == TransactionType.WITHDRAWAL:
            impact = -qty # Cash OUT
        elif tx.transaction_type == TransactionType.DIVIDEND:
            impact = qty # Cash IN
        elif tx.transaction_type == TransactionType.INTEREST:
            impact = qty # Cash IN
        elif tx.transaction_type == TransactionType.FEE:
            impact = -qty # Cash OUT
        elif tx.transaction_type == TransactionType.TAX:
            impact = -qty # Cash OUT
        elif tx.transaction_type == TransactionType.TRANSFER_IN:
            impact = qty 
        elif tx.transaction_type == TransactionType.TRANSFER_OUT:
            impact = -qty
            
        elif tx.transaction_type == TransactionType.BUY:
            # You pay: (qty * price) + fee
            # But fee is often separate or included. 
            # If fee is in the same currency as price/instrument? 
            # Usually strict cash flow = -(qty*price) - fee
            cost = (qty * price) + fee
            impact = -cost
            
        elif tx.transaction_type == TransactionType.SELL:
            # You get: (qty * price) - fee
            proceeds = (qty * price) - fee
            impact = proceeds
            
        # Add converted amount to total
        cash_balance += impact * rate
        
    account.cash = cash_balance.quantize(Decimal("0.01"))
    db.add(account)
    db.flush()
