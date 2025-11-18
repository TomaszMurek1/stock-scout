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
            Transaction.transaction_type.in_([TransactionType.BUY, TransactionType.SELL]),
        )
    )

    if cutoff:
        query = query.filter(Transaction.timestamp >= cutoff)

    txs = query.order_by(Transaction.timestamp.asc()).all()

    return [
        {
            "id": tx.id,
            "ticker": tx.company.ticker if tx.company else "",
            "name": tx.company.name if tx.company else "",
            "transaction_type": tx.transaction_type.value,
            "shares": float(tx.quantity),
            "price": float(tx.price),
            "fee": float(tx.fee or 0),
            "timestamp": tx.timestamp.isoformat(),
            "currency": tx.currency,
            "currency_rate": tx.currency_rate
        }
        for tx in txs
    ]
