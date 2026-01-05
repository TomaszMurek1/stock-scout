# services/valuation/rematerialize.py
from datetime import date, timedelta
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from database.valuation import PortfolioValuationDaily
from database.portfolio import Transaction
from database.account import Account
from services.valuation.materialization_service import (
    run_materialize_range, 
    get_last_pvd_date, 
    get_first_tx_date, 
    delete_range_pvd
)
from api.positions_service import recompute_account_cash

def rematerialize_from_tx(db: Session, portfolio_id: int, tx_day: date, *, end: date | None = None) -> None:
    """
    Incrementally (re)materialize PortfolioValuationDaily for a portfolio
    from the affected transaction date up to 'end' (default: today).
    Overwrites existing rows in that window so cash carry-forward is correct.
    """
    from datetime import date as _date
    end = end or _date.today()

    last_pvd = get_last_pvd_date(db, portfolio_id)

    if last_pvd is None:
        # No PVD yet: start from the first ever transaction (or tx_day as fallback)
        start = get_first_tx_date(db, portfolio_id) or tx_day
    else:
        # Back-dated (or same-day) tx → start at tx_day; otherwise extend the tail
        start = tx_day if tx_day <= last_pvd else (last_pvd + timedelta(days=1))

    if start > end:
        return  # nothing to do

    # Overwrite existing rows in [start..end] to preserve cash chain correctness
    delete_range_pvd(db, portfolio_id, start, end)

    # Compute daily rows for [start..today]
    run_materialize_range(portfolio_id=portfolio_id, start=start, end=end, db=db)

    # Automatically sync "Account.cash" for all accounts in this portfolio
    # This ensures "Cash Available" on dashboard matches the re-materialized history
    accounts = db.query(Account).filter(Account.portfolio_id == portfolio_id).all()
    for acc in accounts:
        recompute_account_cash(db, acc.id)
