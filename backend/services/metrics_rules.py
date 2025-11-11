# services/metrics_rules.py
from __future__ import annotations

from decimal import Decimal as D
from sqlalchemy import func, case, literal
from database.portfolio import Transaction, TransactionType as TT


def amount_sql(t=Transaction):
    """
    Base-CCY amount according to *your* schema:
      amount = (quantity*price if price != 0 else quantity) * COALESCE(currency_rate, 1)
    """
    qty = func.coalesce(getattr(t, "quantity"), literal(0))
    price = func.coalesce(getattr(t, "price"), literal(0))
    rate = func.coalesce(getattr(t, "currency_rate"), literal(1))

    amt_local = case(
        (price != 0, qty * price),
        else_=qty,
    )
    return amt_local * rate


# --- Sign rules (kept in one place) ---

# Investor sign (for MWRR/XIRR):
#   DEPOSIT  -> negative (cash out of investor)
#   WITHDRAW -> positive (cash back)
#   DIVIDEND/INTEREST -> positive
#   FEE/TAX -> negative
INVESTOR_SIGN: dict = {
    TT.DEPOSIT: -1,
    TT.WITHDRAWAL: +1,
    TT.DIVIDEND: +1,
    TT.INTEREST: +1,
    getattr(TT, "FEE", None): -1,
    getattr(TT, "TAX", None): -1,
}

# TWR net external contributions (portfolio-level TTWR):
#   deposit as +flow, withdrawal as -flow
TWR_SIGN_NET_EXTERNAL: dict = {
    TT.DEPOSIT: +1,
    TT.WITHDRAWAL: -1,
}

# TWR trade neutrality (invested-only TTWR):
#   BUY as +flow, SELL as -flow
TWR_SIGN_TRADES: dict = {
    TT.BUY: +1,
    TT.SELL: -1,
}
