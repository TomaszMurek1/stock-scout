# api/portfolio_management.py

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Union

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, case, literal

from api.portfolio_crud import get_or_create_portfolio
from api.positions_service import apply_transaction_to_position, get_default_account_id
from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User
from database.portfolio import (
    Portfolio,
    Transaction,
    FavoriteStock,
)
from database.company import Company
from database.fx import FxRate
from schemas.portfolio_schemas import (
    PortfolioMgmtResponse,
    TradeBase,
    TradeResponse,
    TransactionType,
)
from api.valuation_materialize import materialize_range, rematerialize_from_tx

router = APIRouter()



@router.post("/buy", response_model=TradeResponse)
def buy_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = (
        db.query(Company)
        .filter(Company.ticker == trade.ticker.upper())
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    tx_ts = trade.to_timestamp()
    account_id = get_default_account_id(db, portfolio.id)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account_id,
        company_id=company.company_id,
        transaction_type=TransactionType.BUY,
        quantity=Decimal(str(trade.shares)),
        price=Decimal(str(trade.price)),
        fee=Decimal(str(trade.fee or 0)),
        total_value=(Decimal(str(trade.shares)) * Decimal(str(trade.price))) + Decimal(str(trade.fee or 0)),
        currency=trade.currency,
        currency_rate=Decimal(str(trade.currency_rate)) if trade.currency_rate is not None else None,
        timestamp=tx_ts,
    )
    db.add(tx)
    db.flush()

    apply_transaction_to_position(db, tx)
    db.commit()

    try:
        rematerialize_from_tx(db, portfolio.id, tx.timestamp.date())
    except Exception:
        pass

    return {"message": "Buy recorded"}


@router.post("/sell", response_model=TradeResponse)
def sell_stock(
    trade: TradeBase,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    company = (
        db.query(Company)
        .filter(Company.ticker == trade.ticker.upper())
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    tx_ts = trade.to_timestamp()

    qty_sign_case = case(
        (Transaction.transaction_type == TransactionType.BUY,  literal(1)),
        (Transaction.transaction_type == TransactionType.SELL, literal(-1)),
        else_=literal(0),
    )
    owned = (
        db.query(func.coalesce(func.sum(qty_sign_case * Transaction.quantity), 0))
        .filter(Transaction.portfolio_id == portfolio.id)
        .filter(Transaction.company_id == company.company_id)
        .filter(Transaction.timestamp <= tx_ts)  # as-of check
        .scalar()
    )
    if Decimal(str(owned)) < Decimal(str(trade.shares)):
        raise HTTPException(status_code=400, detail="Insufficient shares to sell as of trade time")

    account_id = get_default_account_id(db, portfolio.id)
    total_value = (Decimal(str(trade.shares)) * Decimal(str(trade.price))) - Decimal(str(trade.fee or 0))

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account_id,
        company_id=company.company_id,
        transaction_type=TransactionType.SELL,
        quantity=Decimal(str(trade.shares)),
        price=Decimal(str(trade.price)),
        fee=Decimal(str(trade.fee or 0)),
        total_value=total_value,
        currency=trade.currency,
        currency_rate=Decimal(str(trade.currency_rate)) if trade.currency_rate is not None else None,
        timestamp=tx_ts,
    )
    db.add(tx)
    db.flush()

    apply_transaction_to_position(db, tx)
    db.commit()

    try:
        rematerialize_from_tx(db, portfolio.id, tx.timestamp.date())
    except Exception:
        pass

    return {"message": "Sell recorded"}

@router.get("", response_model=PortfolioMgmtResponse)
def get_user_portfolio_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Portfolio overview (assets-focused totals):
      - total_portfolio_value = last PVD total_value (cash + assets)
      - total_invested_value  = Σ BUYS − Σ SELLS  (assets cost proxy, base ccy)
      - total_gain_loss       = Σ SELLS + MV_now − Σ BUYS  (assets P&L)
      - percentage_change     = total_gain_loss / Σ BUYS    (assets return)
      - net_external_cash     = Σ(DEPOSIT + TRANSFER_IN − WITHDRAWAL − TRANSFER_OUT)  (shown for context)
    """
    from datetime import date, timedelta
    from decimal import Decimal
    from sqlalchemy import func, and_

    def dec(x) -> Decimal:
        return x if isinstance(x, Decimal) else Decimal(str(x)) if x is not None else Decimal("0")

    # 1) Portfolio
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
    if not portfolio:
        portfolio = Portfolio(user_id=user.id, name="Default", currency="PLN")
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    base_ccy = (portfolio.currency or "USD").upper()

    # 2) First transaction date
    first_tx_dt = (
        db.query(func.min(Transaction.timestamp))
          .filter(Transaction.portfolio_id == portfolio.id)
          .scalar()
    )
    if not first_tx_dt:
        zero = Decimal("0")
        return {
            "portfolio": {"id": portfolio.id, "name": portfolio.name, "base_currency": base_ccy},
            "as_of": date.today(),
            "totals": {
                "total_portfolio_value": zero,
                "total_invested_value": zero,
                "total_gain_loss": zero,
                "percentage_change": None,
                "net_external_cash": zero,
            },
            "series": [],
        }
    first_dt = first_tx_dt.date()

    # 3) Ensure PVD up to today
    from api.valuation_materialize import materialize_range
    from database.valuation import PortfolioValuationDaily

    today = date.today()
    last_row_date = (
        db.query(func.max(PortfolioValuationDaily.date))
          .filter(PortfolioValuationDaily.portfolio_id == portfolio.id)
          .scalar()
    )
    if (last_row_date is None) or (last_row_date < today):
        start = (last_row_date + timedelta(days=1)) if last_row_date else first_dt
        materialize_range(portfolio_id=portfolio.id, start=start, end=today, db=db)

    # 4) Load PVD rows (need by_cash and total_value)
    rows = (
        db.query(PortfolioValuationDaily)
          .filter(
              PortfolioValuationDaily.portfolio_id == portfolio.id,
              PortfolioValuationDaily.date >= first_dt,
          )
          .order_by(PortfolioValuationDaily.date.asc())
          .all()
    )
    if not rows:
        zero = Decimal("0")
        return {
            "portfolio": {"id": portfolio.id, "name": portfolio.name, "base_currency": base_ccy},
            "as_of": today,
            "totals": {
                "total_portfolio_value": zero,
                "total_invested_value": zero,
                "total_gain_loss": zero,
                "percentage_change": None,
                "net_external_cash": zero,
            },
            "series": [],
        }

    as_of = rows[-1].date
    last_total_value = dec(rows[-1].total_value)
    last_by_cash = dec(rows[-1].by_cash)
    current_assets_mv = (last_total_value - last_by_cash).quantize(Decimal("0.0001"))

    # 5) Build series payload
    series = [
        {"date": r.date, "total_value": r.total_value, "net_contributions": r.net_contributions}
        for r in rows
    ]

    # 6) External cash (for context only)
    external_types = (
        TransactionType.DEPOSIT,
        TransactionType.WITHDRAWAL,
        getattr(TransactionType, "TRANSFER_IN", None),
        getattr(TransactionType, "TRANSFER_OUT", None),
    )
    external_types = tuple(t for t in external_types if t is not None)
    ext_rows = (
        db.query(
            Transaction.transaction_type,
            func.sum(Transaction.quantity).label("qty"),
            func.max(Transaction.currency).label("ccy"),
            func.max(Transaction.currency_rate).label("fx_rate"),
        )
        .filter(
            Transaction.portfolio_id == portfolio.id,
            and_(func.date(Transaction.timestamp) >= first_dt,
                 func.date(Transaction.timestamp) <= as_of),
            Transaction.transaction_type.in_(external_types),
        )
        .group_by(Transaction.transaction_type)
        .all()
    )
    ONE = Decimal("1")
    net_external_cash = Decimal("0")
    for ttype, qty, ccy, fx_rate in ext_rows:
        sign = Decimal("1") if ttype in (TransactionType.DEPOSIT, getattr(TransactionType, "TRANSFER_IN", None)) else Decimal("-1")
        fx = ONE if (ccy or "").upper() == base_ccy else (dec(fx_rate) if fx_rate is not None else ONE)
        net_external_cash += sign * dec(qty) * fx
    net_external_cash = net_external_cash.quantize(Decimal("0.0001"))

    # 7) Buys/Sells aggregation in base ccy (fees/taxes excluded)
    bs_rows = (
        db.query(
            Transaction.transaction_type,
            func.sum(Transaction.quantity * Transaction.price).label("gross"),
            func.max(Transaction.currency).label("ccy"),
            func.max(Transaction.currency_rate).label("fx_rate"),
        )
        .filter(
            Transaction.portfolio_id == portfolio.id,
            and_(func.date(Transaction.timestamp) >= first_dt,
                 func.date(Transaction.timestamp) <= as_of),
            Transaction.transaction_type.in_((TransactionType.BUY, TransactionType.SELL)),
        )
        .group_by(Transaction.transaction_type)
        .all()
    )
    sum_buys_base = Decimal("0")
    sum_sells_base = Decimal("0")
    for ttype, gross, ccy, fx_rate in bs_rows:
        fx = ONE if (ccy or "").upper() == base_ccy else (dec(fx_rate) if fx_rate is not None else ONE)
        amt_base = dec(gross) * fx
        if ttype == TransactionType.BUY:
            sum_buys_base += amt_base
        else:
            sum_sells_base += amt_base

    # 8) Assets-focused totals
    total_portfolio_value = last_total_value
    total_invested_value = (sum_buys_base - sum_sells_base).quantize(Decimal("0.0001"))  # what you asked for
    perf_pnl = (sum_sells_base + current_assets_mv - sum_buys_base).quantize(Decimal("0.0001"))
    percentage_change = float(perf_pnl / sum_buys_base) if sum_buys_base > 0 else None

    # 9) Return
    return {
        "portfolio": {"id": portfolio.id, "name": portfolio.name, "base_currency": base_ccy},
        "as_of": as_of,
        "totals": {
            "total_portfolio_value": total_portfolio_value,
            "total_invested_value": total_invested_value,   # ΣBUYS − ΣSELLS
            "total_gain_loss": perf_pnl,                    # assets P&L
            "percentage_change": percentage_change,         # assets return
            "net_external_cash": net_external_cash,         # for context
        },
        "series": series,
    }
