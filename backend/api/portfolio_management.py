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
from database.account import Account
from database.company import Company
from schemas.portfolio_schemas import TradeBase, TradeResponse, TransactionType
from api.valuation_materialize import rematerialize_from_tx
from services.fx.fx_rate_service import fetch_and_save_fx_rate
from database.fx import FxRate
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

CASH_PRECISION = Decimal("0.0001")


def _dec(value) -> Decimal:
    return Decimal(str(value or "0"))


def _get_portfolio_account(db: Session, portfolio, account_id: Optional[int]) -> Account:
    if account_id:
        account = (
            db.query(Account)
            .filter(Account.id == account_id, Account.portfolio_id == portfolio.id)
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found for this portfolio")
    else:
        default_id = get_default_account_id(db, portfolio.id)
        account = db.query(Account).filter(Account.id == default_id).first()
        if not account:
            raise HTTPException(status_code=404, detail="Default account not found")

    if not account.currency and portfolio.currency:
        account.currency = portfolio.currency.upper()
        db.flush()
    return account


def _account_currency(account: Account, portfolio_currency: Optional[str]) -> str:
    if account.currency:
        return account.currency.upper()
    if portfolio_currency:
        return portfolio_currency.upper()
    return "USD"


def _require_account_currency(
    account_currency: str,
    supplied_currency: Optional[str],
    action: str,
):
    # RELAXED: We now allow trade currency to differ from account currency
    # if supplied_currency and supplied_currency.upper() != account_currency:
    #     raise HTTPException(
    #         status_code=400,
    #         detail=f"{action} currency must match account currency ({account_currency})",
    #     )
    pass



def _fx_rate_for_account(
    account_currency: str,
    portfolio_currency: Optional[str],
    provided_rate: Optional[Decimal],
) -> Decimal:
    base_ccy = (portfolio_currency or account_currency).upper()
    trade_to_base_same = (provided_rate is None or provided_rate == Decimal("1"))
    
    # If explicit rate provided, use it
    if provided_rate is not None:
        return _dec(provided_rate)
        
    # Otherwise if currency matches base, return 1
    if account_currency == base_ccy:
        return Decimal("1")
        
    return Decimal("1")

def _get_cross_fx_rate(db: Session, base: str, quote: str, date_obj) -> Decimal:
    """Get FX rate for Base -> Quote on specific date. Fetches if missing."""
    if base == quote:
        return Decimal("1")
        
    # Check DB
    rate = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote, date=date_obj)
        .first()
    )
    if rate:
        return Decimal(str(rate.close))
        
    # Fetch if missing
    fetch_and_save_fx_rate(base, quote, db, date_obj, date_obj)
    
    # Check DB again
    rate = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote, date=date_obj)
        .first()
    )
    if rate:
        return Decimal(str(rate.close))
        
    # If still missing, try inverse
    rate_inv = (
        db.query(FxRate)
        .filter_by(base_currency=quote, quote_currency=base, date=date_obj)
        .first()
    )
    if rate_inv and rate_inv.close:
         return Decimal("1") / Decimal(str(rate_inv.close))

    # Fallback (should be handled better in production)
    log.warning(f"Could not find FX rate {base}->{quote} for {date_obj}. Assuming 1.0")
    return Decimal("1")



def _adjust_account_cash(db: Session, account: Account, delta: Decimal):
    current = _dec(account.cash)
    new_balance = current + _dec(delta)
    if new_balance < Decimal("0"):
        raise HTTPException(status_code=400, detail="Insufficient cash in account")
    account.cash = new_balance.quantize(CASH_PRECISION)
    db.flush()


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


class AccountCashFlowIn(_CashFlowBase):
    account_id: int = Field(..., description="Account receiving the cash movement")


@router.post("/dividend", response_model=TradeResponse)
def add_dividend(
    payload: DividendIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)

    company = (
        db.query(Company)
        .filter(Company.ticker == payload.ticker)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail=f"Company not found for ticker {payload.ticker}")

    account = _get_portfolio_account(db, portfolio, None)

    account_ccy = _account_currency(account, portfolio.currency)
    ccy = (payload.currency or account_ccy).upper()
    _require_account_currency(account_ccy, ccy, "Dividend")
    fx = _fx_rate_for_account(account_ccy, portfolio.currency, payload.currency_rate)
    amount = _dec(payload.amount)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=company.company_id,
        transaction_type=TransactionType.DIVIDEND,
        quantity=amount,                         # store cash amount in 'quantity'
        price=Decimal("1"),                      # neutral price for cash-like tx
        fee=Decimal("0"),                        # withholding/tax should be a separate TAX tx
        total_value=amount,                      # optional/unused downstream
        currency=account_ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()
    _adjust_account_cash(db, account, amount)
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
    account = _get_portfolio_account(db, portfolio, None)

    account_ccy = _account_currency(account, portfolio.currency)
    ccy = (payload.currency or account_ccy).upper()
    _require_account_currency(account_ccy, ccy, "Interest")
    fx = _fx_rate_for_account(account_ccy, portfolio.currency, payload.currency_rate)
    amount = _dec(payload.amount)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=None,                          # interest is account-level cash
        transaction_type=TransactionType.INTEREST,
        quantity=amount,                         # cash amount
        price=Decimal("1"),
        fee=Decimal("0"),
        total_value=amount,
        currency=account_ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()
    _adjust_account_cash(db, account, amount)
    db.commit()

    rematerialize_from_tx(db, portfolio_id=portfolio.id, tx_day=payload.event_date)

    return {"message": "Interest recorded"}


@router.post("/deposit", response_model=TradeResponse)
def deposit_cash(
    payload: AccountCashFlowIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    account = _get_portfolio_account(db, portfolio, payload.account_id)
    account_ccy = _account_currency(account, portfolio.currency)
    _require_account_currency(account_ccy, payload.currency, "Deposit")

    fx = _fx_rate_for_account(account_ccy, portfolio.currency, payload.currency_rate)
    amount = _dec(payload.amount)

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=None,
        transaction_type=TransactionType.DEPOSIT,
        quantity=amount,
        price=Decimal("1"),
        fee=Decimal("0"),
        total_value=amount,
        currency=account_ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()

    _adjust_account_cash(db, account, amount)
    db.commit()

    rematerialize_from_tx(db, portfolio_id=portfolio.id, tx_day=payload.event_date)
    return {"message": "Deposit recorded"}


@router.post("/withdrawal", response_model=TradeResponse)
def withdraw_cash(
    payload: AccountCashFlowIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    portfolio = get_or_create_portfolio(db, user.id)
    account = _get_portfolio_account(db, portfolio, payload.account_id)
    account_ccy = _account_currency(account, portfolio.currency)
    _require_account_currency(account_ccy, payload.currency, "Withdrawal")

    fx = _fx_rate_for_account(account_ccy, portfolio.currency, payload.currency_rate)
    amount = _dec(payload.amount)

    if _dec(account.cash) < amount:
        raise HTTPException(status_code=400, detail="Insufficient cash in account")

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=None,
        transaction_type=TransactionType.WITHDRAWAL,
        quantity=amount,
        price=Decimal("1"),
        fee=Decimal("0"),
        total_value=amount,
        currency=account_ccy,
        currency_rate=fx,
        timestamp=payload.to_timestamp(),
        note=payload.note,
    )
    db.add(tx)
    db.flush()

    _adjust_account_cash(db, account, -amount)
    db.commit()

    rematerialize_from_tx(db, portfolio_id=portfolio.id, tx_day=payload.event_date)
    return {"message": "Withdrawal recorded"}



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
    account = _get_portfolio_account(db, portfolio, trade.account_id)
    account_ccy = _account_currency(account, portfolio.currency)
    trade_ccy = trade.currency.upper()
    _require_account_currency(account_ccy, trade_ccy, "Trade")
    fx = _fx_rate_for_account(account_ccy, portfolio.currency, trade.currency_rate)

    qty = _dec(trade.shares)
    price = _dec(trade.price)
    fee = _dec(trade.fee or 0)
    total_cost_trade_ccy = qty * price + fee
    
    # Calculate impact on Account Cash (convert Trade CCY -> Account CCY)
    # Use explicit rate if provided, otherwise fetch
    if trade.account_currency_rate:
        fx_trade_to_account = _dec(trade.account_currency_rate)
    else:
        fx_trade_to_account = _get_cross_fx_rate(db, trade_ccy, account_ccy, tx_ts.date())
        
    total_cost_account_ccy = total_cost_trade_ccy * fx_trade_to_account
    
    if _dec(account.cash) < total_cost_account_ccy:
        raise HTTPException(status_code=400, detail=f"Insufficient cash in account ({account.currency}) for BUY. Need {total_cost_account_ccy:.2f}, have {account.cash}")

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=company.company_id,
        transaction_type=TransactionType.BUY,
        quantity=qty,
        price=price,
        fee=fee,
        total_value=total_cost_trade_ccy,
        currency=trade_ccy,
        currency_rate=fx,
        timestamp=tx_ts,
    )
    db.add(tx)
    db.flush()

    apply_transaction_to_position(db, tx)
    _adjust_account_cash(db, account, -total_cost_account_ccy)
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

    account = _get_portfolio_account(db, portfolio, trade.account_id)
    account_ccy = _account_currency(account, portfolio.currency)
    trade_ccy = trade.currency.upper()
    _require_account_currency(account_ccy, trade_ccy, "Trade")
    fx = _fx_rate_for_account(account_ccy, portfolio.currency, trade.currency_rate)

    qty = _dec(trade.shares)
    price = _dec(trade.price)
    fee = _dec(trade.fee or 0)
    total_value_trade_ccy = (qty * price) - fee
    
    # Calculate impact on Account Cash (convert Trade CCY -> Account CCY)
    # Use explicit rate if provided, otherwise fetch
    if trade.account_currency_rate:
        fx_trade_to_account = _dec(trade.account_currency_rate)
    else:
        fx_trade_to_account = _get_cross_fx_rate(db, trade_ccy, account_ccy, tx_ts.date())
        
    total_value_account_ccy = total_value_trade_ccy * fx_trade_to_account

    tx = Transaction(
        user_id=user.id,
        portfolio_id=portfolio.id,
        account_id=account.id,
        company_id=company.company_id,
        transaction_type=TransactionType.SELL,
        quantity=qty,
        price=price,
        fee=fee,
        total_value=total_value_trade_ccy,
        currency=trade_ccy,
        currency_rate=fx,
        timestamp=tx_ts,
    )
    db.add(tx)
    db.flush()

    apply_transaction_to_position(db, tx)
    _adjust_account_cash(db, account, total_value_account_ccy)
    db.commit()

    try:
        rematerialize_from_tx(db, portfolio.id, tx.timestamp.date())
    except Exception:
        pass

    return {"message": "Sell recorded"}
