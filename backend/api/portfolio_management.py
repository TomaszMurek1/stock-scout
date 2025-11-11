# api/portfolio_management.py
from __future__ import annotations
from decimal import Decimal, InvalidOperation
import os
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional
from datetime import date, time, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import  and_, func, case, literal

from api.portfolio_crud import get_or_create_portfolio
from api.positions_service import apply_transaction_to_position, get_default_account_id
from services.auth.auth import get_current_user
from database.base import get_db
from database.user import User
from database.portfolio import (
    Portfolio,
    Transaction,
)
from database.company import Company
from schemas.portfolio_schemas import (
    PortfolioMgmtResponse,
    TradeBase,
    TradeResponse,
    TransactionType,
)
from api.valuation_materialize import  rematerialize_from_tx
import logging
from database.valuation import PortfolioValuationDaily
from collections import defaultdict, deque
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP, getcontext
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import func, asc

from database.user import User
from database.portfolio import Portfolio
from database.valuation import PortfolioValuationDaily
from api.valuation_materialize import materialize_range

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

# ---------- IMPORT YOUR MODELS / DB ----------
# Adjust imports to match your project layout

from database.portfolio import Portfolio


# If you have a StockPriceHistory model and want to use it elsewhere, you can import it:
# from database.stock_price_history import StockPriceHistory

# ---------- HELPERS ----------
D = Decimal  # shorthand


def _dec(x) -> Decimal:
    if x is None:
        return D("0")
    if isinstance(x, Decimal):
        return x
    return D(str(x))


def _fmt4(x: Decimal | float | int) -> str:
    return f"{_dec(x):.4f}"


def _first_pvd_date(db: Session, portfolio_id: int) -> Optional[date]:
    row = (
        db.query(PortfolioValuationDaily.date)
        .filter(PortfolioValuationDaily.portfolio_id == portfolio_id)
        .order_by(PortfolioValuationDaily.date.asc())
        .first()
    )
    return row[0] if row else None


def _last_pvd_row(db: Session, portfolio_id: int, as_of: date) -> Optional[PortfolioValuationDaily]:
    return (
        db.query(PortfolioValuationDaily)
        .filter(
            PortfolioValuationDaily.portfolio_id == portfolio_id,
            PortfolioValuationDaily.date <= as_of,
        )
        .order_by(PortfolioValuationDaily.date.desc())
        .first()
    )


def _window_start_ytd(as_of: date) -> date:
    return date(as_of.year, 1, 1)


# ---------- FIFO COST BASIS (from transactions, not price history) ----------
def _fifo_open_cost_basis(
    db: Session, portfolio_id: int, as_of: date
) -> tuple[Decimal, Dict[int, tuple[Decimal, Decimal]]]:
    """
    Returns: (cost_basis_open, lots_by_company)
      - cost_basis_open: total cost basis for currently open positions (FIFO), including per-transaction fees.
      - lots_by_company: company_id -> (open_quantity, avg_cost_per_share)
    """
    # Fetch all buys/sells up to as_of ordered by time
    txs: List[Transaction] = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) <= as_of,
            Transaction.transaction_type.in_([TransactionType.BUY, TransactionType.SELL]),
        )
        .order_by(Transaction.timestamp.asc(), Transaction.id.asc())
        .all()
    )

    lots: Dict[int, List[tuple[Decimal, Decimal]]] = {}  # company_id -> list[(qty_remaining, unit_cost)]
    for t in txs:
        cid = t.company_id
        qty = _dec(t.quantity)
        price = _dec(t.price)
        fee = _dec(t.fee)
        ttype = t.transaction_type

        if ttype == TransactionType.BUY:
            # Allocate total cost including fee across bought quantity (fee added to cost basis)
            total_cost = price * qty + fee
            unit_cost = D("0") if qty == 0 else (total_cost / qty)
            lots.setdefault(cid, []).append((qty, unit_cost))
        elif ttype == TransactionType.SELL:
            # Reduce from FIFO lots
            sell_qty = qty
            if sell_qty <= 0:
                continue
            if cid not in lots:
                # Selling w/o open buy: treat as empty; ignore for open basis
                continue
            new_lots: List[tuple[Decimal, Decimal]] = []
            for q_remaining, u_cost in lots[cid]:
                if sell_qty <= 0:
                    new_lots.append((q_remaining, u_cost))
                    continue
                if q_remaining <= sell_qty:
                    # Entire lot closed
                    sell_qty -= q_remaining
                else:
                    # Partial close
                    new_lots.append((q_remaining - sell_qty, u_cost))
                    sell_qty = D("0")
            lots[cid] = new_lots

    # Compute open basis
    cost_basis_open = D("0")
    lots_by_company: Dict[int, tuple[Decimal, Decimal]] = {}
    for cid, buckets in lots.items():
        total_q = D("0")
        total_cost = D("0")
        for q, u in buckets:
            total_q += q
            total_cost += q * u
        if total_q > 0:
            lots_by_company[cid] = (total_q, total_cost / total_q)
            cost_basis_open += total_cost

    return cost_basis_open, lots_by_company


# ---------- AGGREGATIONS ----------
class _Agg:
    def __init__(self) -> None:
        self.div = D("0")
        self.interest = D("0")
        self.fees_standalone = D("0")
        self.buy_sell_fees = D("0")
        self.taxes = D("0")
        self.net_external_cash = D("0")

    @property
    def dividends_interest(self) -> Decimal:
        return self.div + self.interest

    @property
    def total_costs(self) -> Decimal:
        return self.buy_sell_fees + self.fees_standalone + self.taxes


def _aggregate_totals(db: Session, portfolio_id: int, as_of: date) -> _Agg:
    q = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) <= as_of,
        )
    )
    agg = _Agg()
    for t in q:
        ttype = t.transaction_type
        fee = _dec(t.fee)
        amt = _dec(t.total_value) if t.total_value is not None else _dec(t.price) * _dec(t.quantity)

        if ttype == TransactionType.DIVIDEND:
            agg.div += amt
        elif ttype == TransactionType.INTEREST:
            agg.interest += amt
        elif ttype == TransactionType.FEE:
            agg.fees_standalone += fee if fee != 0 else amt  # support either way
        elif ttype == TransactionType.TAX:
            agg.taxes += amt
        elif ttype == TransactionType.BUY:
            agg.buy_sell_fees += fee
        elif ttype == TransactionType.SELL:
            agg.buy_sell_fees += fee
        elif ttype == TransactionType.DEPOSIT:
            agg.net_external_cash += amt
        elif ttype == TransactionType.WITHDRAWAL:
            agg.net_external_cash -= amt

    log.debug(
        "[AGGR] div=%s interest=%s  fees_standalone=%s buy_sell_fees=%s taxes=%s total_costs=%s net_external_cash=%s",
        _fmt4(agg.div),
        _fmt4(agg.interest),
        _fmt4(agg.fees_standalone),
        _fmt4(agg.buy_sell_fees),
        _fmt4(agg.taxes),
        _fmt4(agg.total_costs),
        _fmt4(agg.net_external_cash),
    )
    return agg


# ---------- EQUITY FLOWS (for equity-only TWR) ----------
def _equity_flows_by_day(db: Session, portfolio_id: int, start_d: date, end_d: date) -> Dict[date, Decimal]:
    """
    Equity sub-portfolio external flows by day:
      + BUY  : cash -> equity  (positive inflow to equity)
      - SELL : equity -> cash  (negative for equity)
      - DIV  : equity -> cash  (negative for equity)
      - INT  : equity -> cash  (negative for equity)
      - FEE  : (optional) treat standalone fees as equity outflows; here we include them
    """
    from collections import defaultdict

    flows = defaultdict(lambda: D("0"))
    q = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            func.date(Transaction.timestamp) >= start_d,
            func.date(Transaction.timestamp) <= end_d,
        )
    )
    for t in q:
        d = t.timestamp.date()
        qty = _dec(t.quantity)
        price = _dec(t.price)
        fee = _dec(t.fee)
        amt = _dec(t.total_value) if t.total_value is not None else price * qty
        tt = t.transaction_type

        if tt == TransactionType.BUY:
            flows[d] += price * qty + fee
        elif tt == TransactionType.SELL:
            flows[d] -= price * qty - fee
        elif tt in (TransactionType.DIVIDEND, TransactionType.INTEREST):
            flows[d] -= amt
        elif tt == TransactionType.FEE:
            flows[d] -= (fee if fee != 0 else amt)
        # DEPOSIT/WITHDRAW ignored for equity
    return dict(flows)


# ---------- TWR COMPUTATIONS ----------
def _compute_twr(
    rows: List[tuple[date, Decimal, Decimal]],
    *,
    label: Optional[str] = None,
    log_days: int = 0,
) -> Optional[float]:
    """
    rows: list of (d, portfolio_value, net_contrib) ordered by date asc
    """
    if len(rows) < 2:
        return None

    product = D("1")
    prev_mv = _dec(rows[0][1])

    def _should_log(i: int) -> bool:
        return log_days > 0 and (i <= log_days or i >= (len(rows) - log_days))

    for i in range(1, len(rows)):
        d, mv, flow = rows[i]
        mv = _dec(mv)
        flow = _dec(flow)

        if prev_mv == 0:
            if _should_log(i) and label:
                log.debug("[TWR] %s prevMV=0 at %s -> skip", label, d)
            prev_mv = mv
            continue

        r_t = (mv - (prev_mv + flow)) / prev_mv
        product *= (D("1") + r_t)
        if _should_log(i) and label:
            log.debug("[TWR] %s prevMV=%s mv=%s flow=%s  r_t=%s prod=%s", d, prev_mv, mv, flow, r_t, product)

        prev_mv = mv

    twr = float(product - D("1"))
    if label:
        log.debug("[TWR] %s=%s", label, twr)
    return twr


def _compute_equity_twr(
    eq_rows: List[tuple[date, Decimal]],
    eq_flows: Dict[date, Decimal],
    *,
    label: Optional[str] = None,
    log_days: int = 0,
) -> Optional[float]:
    """
    eq_rows: list of (d, market_value_only) ordered by date asc
    eq_flows: dict date -> external flow for equity on that date
    """
    if len(eq_rows) < 2:
        return None

    product = D("1")
    prev_mv = _dec(eq_rows[0][1])

    def _should_log(i: int) -> bool:
        return log_days > 0 and (i <= log_days or i >= (len(eq_rows) - log_days))

    for i in range(1, len(eq_rows)):
        d, mv = eq_rows[i]
        mv = _dec(mv)
        flow = _dec(eq_flows.get(d, D("0")))

        if prev_mv == 0:
            if _should_log(i) and label:
                log.debug("[eTWR] %s prevMV=0 at %s -> skip", label, d)
            prev_mv = mv
            continue

        r_t = (mv - (prev_mv + flow)) / prev_mv
        product *= (D("1") + r_t)
        if _should_log(i) and label:
            log.debug("[eTWR] %s prevMV=%s mv=%s flow=%s r_t=%s prod=%s", d, prev_mv, mv, flow, r_t, product)

        prev_mv = mv

    twr = float(product - D("1"))
    if label:
        log.debug("[eTWR] %s=%s", label, twr)
    return twr


# ---------- RESPONSE MODELS (Pydantic v2-safe) ----------
class PeriodReturns(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    ytd: Optional[float] = Field(default=None, serialization_alias="YTD")
    one_y: Optional[float] = Field(default=None, serialization_alias="1Y")
    two_y: Optional[float] = Field(default=None, serialization_alias="2Y")


class TotalsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    total_portfolio_value: Decimal
    cash_balance: Decimal
    market_value_open: Decimal
    cost_basis_open: Decimal
    percentage_change_open: Optional[float] = None  # (MV - cost) / cost
    dividends_interest_total: Decimal
    total_return_open: Optional[float] = None  # (MV + divint - cost) / cost
    fees_standalone_total: Decimal
    buy_sell_fees_total: Decimal
    taxes_total: Decimal
    total_costs: Decimal
    total_return_open_after_costs: Optional[float] = None  # (MV + divint - cost - costs) / cost
    net_external_cash: Decimal


class PortfolioManagementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    totals: TotalsOut
    period_returns: PeriodReturns
    period_returns_equity: PeriodReturns


# ---------- ENDPOINT ----------
@router.get("")
def get_portfolio_management(
    portfolio_id: int = 2,  # adapt to your context or read from current user
    as_of: Optional[date] = None,
    db: Session = Depends(get_db),
):
    if as_of is None:
        as_of = datetime.utcnow().date()

    # Ensure portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Latest daily valuation row
    last = _last_pvd_row(db, portfolio_id, as_of)
    if not last:
        raise HTTPException(status_code=404, detail="No valuations for this portfolio")

    total_value = _dec(last.total_value)
    cash_balance = _dec(last.by_cash)
    market_value_open = total_value - cash_balance

    # Show tail for visibility (mirrors your debug style)
    tail = (
        db.query(
            PortfolioValuationDaily.date,
            PortfolioValuationDaily.total_value,
            PortfolioValuationDaily.by_cash,
            PortfolioValuationDaily.net_contributions,
        )
        .filter(
            PortfolioValuationDaily.portfolio_id == portfolio_id,
            PortfolioValuationDaily.date <= as_of,
        )
        .order_by(PortfolioValuationDaily.date.desc())
        .limit(14)
        .all()
    )
    if tail:
        log.debug("PVD tail (portfolio_id=%s):", portfolio_id)
        for d, tot, cash, flow in reversed(tail):
            mv = _dec(tot) - _dec(cash)
            log.debug("  %s  MV=%s  flow=%s  total=%s  cash=%s", d, _fmt4(mv), _fmt4(flow), _fmt4(tot), _fmt4(cash))

    # FIFO open cost basis (from transactions, includes fees)
    cost_basis_open, lots_by_company = _fifo_open_cost_basis(db, portfolio_id, as_of)
    log.debug("[OPEN] MV_open(PVD)=%s  cash=%s  cost_basis_open(FIFO)=%s",
              _fmt4(market_value_open), _fmt4(cash_balance), _fmt4(cost_basis_open))

    # Aggregations (dividends, interest, fees, taxes, net external cash)
    aggr = _aggregate_totals(db, portfolio_id, as_of)

    # Open-only percentages
    pct_open = None
    tr_open = None
    tr_open_after_costs = None
    if cost_basis_open > 0:
        pct_open = float((market_value_open - cost_basis_open) / cost_basis_open)
        tr_open = float((market_value_open + aggr.dividends_interest - cost_basis_open) / cost_basis_open)
        tr_open_after_costs = float(
            (market_value_open + aggr.dividends_interest - cost_basis_open - aggr.total_costs) / cost_basis_open
        )

    # ---------- Whole-portfolio TWR ----------
    first_dt = _first_pvd_date(db, portfolio_id) or _window_start_ytd(as_of)
    def _rows_window(start_d: date, end_d: date) -> List[Tuple[date, Decimal, Decimal]]:
        rows = (
            db.query(
                PortfolioValuationDaily.date,
                PortfolioValuationDaily.total_value,
                PortfolioValuationDaily.net_contributions,
            )
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= start_d,
                PortfolioValuationDaily.date <= end_d,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        return [(d, _dec(tot), _dec(flow)) for d, tot, flow in rows]

    ytd_rows = _rows_window(_window_start_ytd(as_of), as_of)
    ytd = _compute_twr(ytd_rows, label="YTD", log_days=5) if ytd_rows else None

    one_year_start = max(first_dt, as_of - timedelta(days=365))
    one_rows = _rows_window(one_year_start, as_of)
    one_y = _compute_twr(one_rows, label="1Y", log_days=5) if one_rows else None

    two_year_start = max(first_dt, as_of - timedelta(days=730))
    two_rows = _rows_window(two_year_start, as_of)
    two_y = _compute_twr(two_rows, label="2Y", log_days=5) if two_rows else None

    # ---------- Equity-only TWR ----------
    def _eq_rows_window(start_d: date, end_d: date) -> List[Tuple[date, Decimal]]:
        rows = (
            db.query(
                PortfolioValuationDaily.date,
                PortfolioValuationDaily.total_value,
                PortfolioValuationDaily.by_cash,
            )
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= start_d,
                PortfolioValuationDaily.date <= end_d,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        eq_rows = []
        for d, tot, cash in rows:
            eq_mv = _dec(tot) - _dec(cash)
            eq_rows.append((d, eq_mv))
        return eq_rows

    eytd_rows = _eq_rows_window(_window_start_ytd(as_of), as_of)
    eflows_ytd = _equity_flows_by_day(db, portfolio_id, _window_start_ytd(as_of), as_of)
    eytd = _compute_equity_twr(eytd_rows, eflows_ytd, label="YTD", log_days=5) if eytd_rows else None

    e1_rows = _eq_rows_window(one_year_start, as_of)
    eflows_1y = _equity_flows_by_day(db, portfolio_id, one_year_start, as_of)
    e1y = _compute_equity_twr(e1_rows, eflows_1y, label="1Y", log_days=5) if e1_rows else None

    e2_rows = _eq_rows_window(two_year_start, as_of)
    eflows_2y = _equity_flows_by_day(db, portfolio_id, two_year_start, as_of)
    e2y = _compute_equity_twr(e2_rows, eflows_2y, label="2Y", log_days=5) if e2_rows else None

    # ---------- Build response ----------
    totals = TotalsOut(
        total_portfolio_value=total_value,
        cash_balance=cash_balance,
        market_value_open=market_value_open,
        cost_basis_open=cost_basis_open,
        percentage_change_open=pct_open,
        dividends_interest_total=aggr.dividends_interest,
        total_return_open=tr_open,
        fees_standalone_total=aggr.fees_standalone,
        buy_sell_fees_total=aggr.buy_sell_fees,
        taxes_total=aggr.taxes,
        total_costs=aggr.total_costs,
        total_return_open_after_costs=tr_open_after_costs,
        net_external_cash=aggr.net_external_cash,
    )
    pr = PeriodReturns(ytd=ytd, one_y=one_y, two_y=two_y)
    pre = PeriodReturns(ytd=eytd, one_y=e1y, two_y=e2y)

    # Use by_alias=True so "YTD", "1Y", "2Y" appear in JSON
    out = PortfolioManagementOut(totals=totals, period_returns=pr, period_returns_equity=pre)
    payload = out.model_dump(by_alias=True)

    # One-line summaries for logs
    log.debug("[TWR] YTD=%s", payload["period_returns"].get("YTD"))
    log.debug("[TWR] 1Y=%s", payload["period_returns"].get("1Y"))
    log.debug("[TWR] 2Y=%s", payload["period_returns"].get("2Y"))

    return payload


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