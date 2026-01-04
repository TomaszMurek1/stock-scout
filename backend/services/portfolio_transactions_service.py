from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, selectinload
from database.portfolio import Transaction
from schemas.portfolio_schemas import  TransactionType

def parse_period_window(period: str):
    if period.upper() == "ALL":
        return None
    mapping = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}
    days = mapping.get(period.upper(), 30)
    return datetime.now(timezone.utc) - timedelta(days=days)


def get_transactions_for_portfolio(db: Session, portfolio_id: int, period: str = "ALL"):
    cutoff = parse_period_window(period)

    query = (
        db.query(Transaction)
        .options(selectinload(Transaction.company))
        .filter(
            Transaction.portfolio_id == portfolio_id,
            Transaction.transaction_type.in_([
                TransactionType.BUY, 
                TransactionType.SELL,
                TransactionType.DEPOSIT,
                TransactionType.WITHDRAWAL,
                TransactionType.DIVIDEND,
                TransactionType.INTEREST,
                TransactionType.FEE,
                TransactionType.TAX
            ]),
        )
    )

    if cutoff:
        query = query.filter(Transaction.timestamp >= cutoff)

    txs = query.order_by(Transaction.timestamp.asc()).all()

    results = []
    for tx in txs:
        # Determine effective "Amount"
        # For pure cash flows (Deposit, Dividend, etc.), the quantity IS the amount.
        # For trades (Buy/Sell), amount is Price * Quantity (or total_value if stored)
        is_cash_flow = tx.transaction_type.name in [
            "DEPOSIT", "WITHDRAWAL", "DIVIDEND", "INTEREST", "TAX", "FEE"
        ]
        
        qty = float(tx.quantity)
        price = float(tx.price or 0.0)
        
        if is_cash_flow:
            amount = qty
        elif tx.transaction_type.name in ["BUY", "SELL"]:
             # Prefer calculating from Price * Qty because total_value in DB 
             # has been found to be inconsistent (sometimes Portfolio Ccy, sometimes Tx Ccy).
             # Price is reliably in Tx Ccy.
             amount = qty * price
        else:
            amount = float(tx.total_value or (qty * price))
            
        results.append({
            "id": tx.id,
            "ticker": tx.company.ticker if tx.company else "",
            "name": tx.company.name if tx.company else "",
            "transaction_type": tx.transaction_type.value,
            "shares": qty,
            "price": price,
            "fee": float(tx.fee or 0),
            "timestamp": tx.timestamp.isoformat(),
            "currency": tx.currency,
            "currency_rate": tx.currency_rate,
            "amount": amount
        })

    return results
