# api/portfolio_management.py
from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, time, datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal

from api.portfolio_crud import get_or_create_portfolio
from api.positions_service import apply_transaction_to_position, get_default_account_id
from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User
from database.portfolio import Transaction
from database.company import Company
from schemas.portfolio_schemas import TradeBase, TradeResponse, TransactionType
from api.valuation_materialize import rematerialize_from_tx
from decimal import Decimal, getcontext
import logging

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
log = logging.getLogger("api.portfolio_management")
if not log.handlers:
    handler = logging.StreamHandler()
    fmt = logging.Formatter(
        "%(levelname)s:%(name)s:%(message)s"
    )
    handler.setFormatter(fmt)
    log.addHandler(handler)
log.setLevel(logging.DEBUG)


# ---------- DECIMAL PRECISION ----------
getcontext().prec = 28

# ---------- FASTAPI ROUTER ----------
router = APIRouter()


# ---------- Request models ----------

class _CashFlowBase(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Cash amount in the transaction currency")
    currency: Optional[str] = Field(None, description="3-letter currency code (defaults to portfolio base)")
    currency_rate: Optional[Decimal] = Field(
        None, description="FX rate to convert amount->base (omit or 1.0 if same as base)"
    )
    event_date: date = Field(..., description="Effective date (YYYY-MM-DD)")
    event_time: Optional[time] = Field(None, description="Optional time, default end of day")
    note: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def _norm_currency(cls, v):
        if v is None:
            return v
        v = v.strip().upper()
        if len(v) != 3:
            raise ValueError("currency must be a 3-letter code")
        return v

    def to_timestamp(self) -> datetime:
        return datetime.combine(self.event_date, self.event_time or time(23, 59, 59))


class DividendIn(_CashFlowBase):
    ticker: str = Field(..., description="Ticker receiving the dividend")

    @field_validator("ticker")
    @classmethod
    def _norm_ticker(cls, v):
        v = (v or "").strip().upper()
        if not v:
            raise ValueError("ticker is required")
        return v


class InterestIn(_CashFlowBase):
    # For now we tie interest to the default cash account of the portfolio.
    # If you add multi-account support later, accept account_id here.
    pass


@router.post("/dividend", response_model=TradeResponse)
def add_dividend(
    payload: DividendIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    base_ccy = (portfolio.currency or "PLN").upper()

    company = (
        db.query(Company)
        .filter(Company.ticker == payload.ticker)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail=f"Company not found for ticker {payload.ticker}")

    account_id = get_default_account_id(db, portfolio.id)

    # If no currency provided -> assume base, fx=1
    ccy = (payload.currency or base_ccy).upper()
    fx = Decimal("1") if ccy == base_ccy else (payload.currency_rate or None)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account_id,
        company_id=company.company_id,
        transaction_type=TransactionType.DIVIDEND,
        quantity=payload.amount,                 # store cash amount in 'quantity'
        price=Decimal("1"),                      # neutral price for cash-like tx
        fee=Decimal("0"),                        # withholding/tax should be a separate TAX tx
        total_value=payload.amount,              # optional/unused downstream
        currency=ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()
    db.commit()

    # Rematerialize from this date to keep PVD correct
    rematerialize_from_tx(db, portfolio_id=portfolio.id, tx_day=payload.event_date)

    return {"message": "Dividend recorded"}


@router.post("/interest", response_model=TradeResponse)
def add_interest(
    payload: InterestIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    base_ccy = (portfolio.currency or "PLN").upper()
    account_id = get_default_account_id(db, portfolio.id)

    ccy = (payload.currency or base_ccy).upper()
    fx = Decimal("1") if ccy == base_ccy else (payload.currency_rate or None)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account_id,
        company_id=None,                          # interest is account-level cash
        transaction_type=TransactionType.INTEREST,
        quantity=payload.amount,                 # cash amount
        price=Decimal("1"),
        fee=Decimal("0"),
        total_value=payload.amount,
        currency=ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()
    db.commit()

    rematerialize_from_tx(db, portfolio_id=portfolio.id, tx_day=payload.event_date)

    return {"message": "Interest recorded"}



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

    # 👇 use user-selected account if present, otherwise fallback
    account_id = trade.account_id or get_default_account_id(db, portfolio.id)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account_id,
        company_id=company.company_id,
        transaction_type=TransactionType.BUY,
        quantity=Decimal(str(trade.shares)),
        price=Decimal(str(trade.price)),
        fee=Decimal(str(trade.fee or 0)),
        total_value=(
            Decimal(str(trade.shares)) * Decimal(str(trade.price))
        ) + Decimal(str(trade.fee or 0)),
        currency=trade.currency,
        currency_rate=(
            Decimal(str(trade.currency_rate))
            if trade.currency_rate is not None
            else None
        ),
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
        .filter(Transaction.timestamp <= tx_ts)
        .scalar()
    )
    if Decimal(str(owned)) < Decimal(str(trade.shares)):
        raise HTTPException(status_code=400, detail="Insufficient shares to sell as of trade time")

    # 👇 use user-selected account if present, otherwise fallback
    account_id = trade.account_id or get_default_account_id(db, portfolio.id)
    total_value = (
        Decimal(str(trade.shares)) * Decimal(str(trade.price))
    ) - Decimal(str(trade.fee or 0))

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
        currency_rate=(
            Decimal(str(trade.currency_rate))
            if trade.currency_rate is not None
            else None
        ),
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