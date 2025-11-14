from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.valuation import PortfolioValuationDaily
from database.portfolio import Transaction, TransactionType, Portfolio

def _dec(x) -> Decimal:
    return Decimal(str(x or "0"))

def get_portfolio_snapshot(
    db: Session,
    portfolio: Portfolio,
) -> Optional[dict]:
    """
    Returns latest valuation snapshot + cash/invested breakdown +
    lifetime net invested cash (in portfolio currency).
    """
    pvd = (
        db.query(PortfolioValuationDaily)
        .filter(PortfolioValuationDaily.portfolio_id == portfolio.id)
        .order_by(PortfolioValuationDaily.date.desc())
        .first()
    )

    if not pvd:
        return None

    base_ccy = (portfolio.currency or "").upper()

    # --- 1) Current valuation pieces (already in base currency) ---
    total_value = _dec(pvd.total_value)
    cash_available = _dec(pvd.by_cash)
    invested_value_current = total_value - cash_available

    # --- 2) Lifetime net invested cash into securities (BUY/SELL only) ---
    #     Using transaction.currency_rate as FX to base.
    from sqlalchemy import func

    tx_rows = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio.id,
            Transaction.transaction_type.in_([TransactionType.BUY, TransactionType.SELL]),
            func.date(Transaction.timestamp) <= pvd.date,  # up to same date as valuation
        )
        .all()
    )

    net_invested = Decimal("0")

    for tx in tx_rows:
        qty = _dec(tx.quantity)
        price = _dec(tx.price)
        fee = _dec(tx.fee)
        tx_ccy = (tx.currency or "").upper()

        # FX: transaction currency -> portfolio currency
        if tx_ccy == base_ccy:
            fx = Decimal("1")
        else:
            fx = _dec(tx.currency_rate or 1)

        if tx.transaction_type == TransactionType.BUY:
            # Money OUT = (qty * price + fee)
            cash_out_base = (qty * price + fee) * fx
            net_invested += cash_out_base
        elif tx.transaction_type == TransactionType.SELL:
            # Money IN = (qty * price - fee)
            cash_in_base = (qty * price - fee) * fx
            net_invested -= cash_in_base

    # Round everything to 2 decimals for dashboard
    total_value = total_value.quantize(Decimal("0.01"))
    cash_available = cash_available.quantize(Decimal("0.01"))
    invested_value_current = invested_value_current.quantize(Decimal("0.01"))
    net_invested = net_invested.quantize(Decimal("0.01"))

    return {
        "as_of": pvd.date.isoformat(),
        "total_value": float(total_value),
        "cash_available": float(cash_available),
        "invested_value_current": float(invested_value_current),
        "net_invested_cash": float(net_invested),
    }
