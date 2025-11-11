# services/portfolio_metrics_service.py
from __future__ import annotations

import calendar
import math
import logging
from decimal import Decimal, getcontext
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional, Dict

from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal

from database.portfolio import Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

# High precision for Decimal math
getcontext().prec = 28
D = Decimal

logger = logging.getLogger("stockscout.metrics")


class PortfolioMetricsService:
    """
    Implementation bound to your schema.

    transactions columns used:
      - transaction_type (enum TransactionType)
      - quantity (Decimal)
      - price (Decimal)
      - currency_rate (Decimal)
      - timestamp (datetime)
      - portfolio_id (int)

    amount(base ccy) rule:
      base_amount = (quantity * price if price != 0 else quantity) * COALESCE(currency_rate, 1)

    TTWR (portfolio): external flows = +DEPOSIT, -WITHDRAWAL
    TTWR (invested): trade flows = +BUY, -SELL; value uses invested MV (sum of asset buckets if present)
    MWRR (XIRR): investor sign (+ inflow to investor, - outflow):
      DEPOSIT -> negative, WITHDRAWAL -> positive,
      DIVIDEND/INTEREST -> positive, FEE/TAX -> negative
    """

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------
    # Period helpers
    # ---------------------------
    @staticmethod
    def _subtract_months(d: date, months: int) -> date:
        y = d.year
        m = d.month - months
        while m <= 0:
            m += 12
            y -= 1
        day = min(d.day, calendar.monthrange(y, m)[1])
        return date(y, m, day)

    def get_period_start_date(self, portfolio_id: int, end_date: date, period: str) -> Optional[date]:
        p = (period or "").lower()

        if p in ("1d", "daily"):
            return end_date - timedelta(days=1)
        if p in ("1w", "weekly"):
            return end_date - timedelta(days=7)
        if p in ("1m", "monthly"):
            return self._subtract_months(end_date, 1)
        if p == "3m":
            return self._subtract_months(end_date, 3)
        if p in ("6m", "half_year"):
            return self._subtract_months(end_date, 6)
        if p in ("1y", "yearly"):
            y = end_date.year - 1
            day = min(end_date.day, calendar.monthrange(y, end_date.month)[1])
            return date(y, end_date.month, day)
        if p == "ytd":
            return date(end_date.year, 1, 1)
        if p == "qtd":
            q_month = ((end_date.month - 1) // 3) * 3 + 1
            return date(end_date.year, q_month, 1)
        if p == "mtd":
            return date(end_date.year, end_date.month, 1)
        if p == "wtd":
            return end_date - timedelta(days=end_date.weekday())
        if p == "itd":
            first_tx = (
                self.db.query(Transaction.timestamp)
                .filter(Transaction.portfolio_id == portfolio_id)
                .order_by(Transaction.timestamp.asc())
                .first()
            )
            return first_tx[0].date() if first_tx else None

        return end_date - timedelta(days=30)

    # ---------------------------
    # Valuation helpers
    # ---------------------------
    def _last_valuation_on_or_before(self, portfolio_id: int, day: date) -> Optional[date]:
        row = (
            self.db.query(PortfolioValuationDaily.date)
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date <= day,
            )
            .order_by(PortfolioValuationDaily.date.desc())
            .first()
        )
        return row[0] if row else None

    def _valuation_as_of(self, portfolio_id: int, valuation_date: date) -> Optional[Decimal]:
        row = (
            self.db.query(PortfolioValuationDaily.total_value)
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date <= valuation_date,
            )
            .order_by(PortfolioValuationDaily.date.desc())
            .first()
        )
        if not row:
            return None
        v = row[0]
        return v if isinstance(v, Decimal) else D(str(v))

    # ---------------------------
    # Amount expressions (SQL + Python) — strictly your schema
    # ---------------------------
    def _amount_sql(self, t_alias=None):
        """
        SQL expression: base_amount = (CASE WHEN price != 0 THEN quantity*price ELSE quantity END) * COALESCE(currency_rate, 1)
        """
        t = t_alias or Transaction
        qty = func.coalesce(getattr(t, "quantity"), literal(0))
        price = func.coalesce(getattr(t, "price"), literal(0))
        rate = func.coalesce(getattr(t, "currency_rate"), literal(1))

        amt_local = case(
            (price != 0, qty * price),
            else_=qty,
        )
        return amt_local * rate

    @staticmethod
    def _amount_py(quantity, price, currency_rate) -> Decimal:
        q = quantity if isinstance(quantity, Decimal) else D(str(quantity or 0))
        p = price if isinstance(price, Decimal) else D(str(price or 0))
        r = currency_rate if isinstance(currency_rate, Decimal) else D(str(currency_rate or 1))
        base = (q * p) if p != 0 else q
        return base * r

    # ---------------------------
    # TTWR (portfolio-level): external flows = +DEPOSIT, -WITHDRAWAL
    # ---------------------------
    def _daily_external_flows_map(self, portfolio_id: int, start_date: date, end_date: date) -> Dict[date, Decimal]:
        t = Transaction
        amt = self._amount_sql(t)

        # Use amt and -1 * amt (no unary + on SQLAlchemy expressions)
        signed_amt = case(
            (t.transaction_type == TransactionType.DEPOSIT, amt),
            (t.transaction_type == TransactionType.WITHDRAWAL, -1 * amt),
            else_=literal(0),
        )

        q = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                func.sum(signed_amt),
            )
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]),
            )
            .group_by("d")
            .all()
        )

        flows: Dict[date, Decimal] = {}
        for d, val in q:
            val = val if isinstance(val, Decimal) else D(str(val or 0))
            flows[d] = flows.get(d, D("0")) + val
        return flows

    def _rows_from_pvd_portfolio(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal, Decimal]]:
        rows = (
            self.db.query(
                PortfolioValuationDaily.date,
                PortfolioValuationDaily.total_value,
            )
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= start_date,
                PortfolioValuationDaily.date <= end_date,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        flow_map = self._daily_external_flows_map(portfolio_id, start_date, end_date)

        out: List[Tuple[date, Decimal, Decimal]] = []
        for d, tot in rows:
            tot_dec = tot if isinstance(tot, Decimal) else D(str(tot or 0))
            out.append((d, tot_dec, flow_map.get(d, D("0"))))
        return out

    # ---------------------------
    # TTWR (invested-only): trade flows BUY(+), SELL(-)
    # ---------------------------
    def _invested_expression(self):
        # Prefer: sum of asset buckets if present
        cols = []
        for c in ("by_stock", "by_etf", "by_bond", "by_crypto", "by_commodity"):
            if hasattr(PortfolioValuationDaily, c):
                cols.append(func.coalesce(getattr(PortfolioValuationDaily, c), literal(0)))
        if cols:
            expr = cols[0]
            for c in cols[1:]:
                expr = expr + c
            return expr.label("invested_mv")

        # Fallback: total_value - cash_balance, if exists
        if hasattr(PortfolioValuationDaily, "cash_balance"):
            return (func.coalesce(PortfolioValuationDaily.total_value, literal(0)) -
                    func.coalesce(getattr(PortfolioValuationDaily, "cash_balance"), literal(0))).label("invested_mv")

        # Last resort: use total_value
        return func.coalesce(PortfolioValuationDaily.total_value, literal(0)).label("invested_mv")

    def _rows_from_pvd_invested(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal, Decimal]]:
        invested_expr = self._invested_expression()
        rows = (
            self.db.query(
                PortfolioValuationDaily.date,
                invested_expr,
            )
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= start_date,
                PortfolioValuationDaily.date <= end_date,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )

        t = Transaction
        amt = self._amount_sql(t)
        trade_signed = case(
            (t.transaction_type == TransactionType.BUY, amt),
            (t.transaction_type == TransactionType.SELL, -1 * amt),
            else_=literal(0),
        )

        q = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                func.sum(trade_signed),
            )
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_([TransactionType.BUY, TransactionType.SELL]),
            )
            .group_by("d")
            .all()
        )

        flow_map: Dict[date, Decimal] = {d: (v if isinstance(v, Decimal) else D(str(v or 0))) for d, v in q}

        out: List[Tuple[date, Decimal, Decimal]] = []
        for d, inv_mv in rows:
            inv_mv_dec = inv_mv if isinstance(inv_mv, Decimal) else D(str(inv_mv or 0))
            out.append((d, inv_mv_dec, flow_map.get(d, D("0"))))
        return out

    # ---------------------------
    # Chain function
    # ---------------------------
    @staticmethod
    def _chain_twr(rows: List[Tuple[date, Decimal, Decimal]]) -> Optional[Decimal]:
        if len(rows) < 2:
            return None
        product = D("1")
        prev_mv = rows[0][1]
        for i in range(1, len(rows)):
            _, mv_t, flow_t = rows[i]
            if prev_mv == 0:
                prev_mv = mv_t
                continue
            r_t = (mv_t - (prev_mv + flow_t)) / prev_mv
            product *= (D("1") + r_t)
            prev_mv = mv_t
        return product - D("1")

    # ---------------------------
    # Public: TTWR
    # ---------------------------
    def calculate_ttwr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        effective_end = self._last_valuation_on_or_before(portfolio_id, end_date) or end_date
        rows = self._rows_from_pvd_portfolio(portfolio_id, start_date, effective_end)
        twr = self._chain_twr(rows)
        return twr if twr is not None else D("0")

    def calculate_ttwr_invested_only(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        effective_end = self._last_valuation_on_or_before(portfolio_id, end_date) or end_date
        rows = self._rows_from_pvd_invested(portfolio_id, start_date, effective_end)
        twr = self._chain_twr(rows)
        return twr if twr is not None else D("0")

    # ---------------------------
    # MWRR / XIRR (investor sign convention)
    # ---------------------------
    @staticmethod
    def _xnpv(rate: float, flows: List[Tuple[date, Decimal]]) -> float:
        t0 = flows[0][0]
        acc = 0.0
        base = 1.0 + rate
        for d, cf in flows:
            days = (d - t0).days
            acc += float(cf) / (base ** (days / 365.0))
        return acc

    def _xirr(self, flows: List[Tuple[date, Decimal]]) -> Optional[float]:
        f = lambda r: self._xnpv(r, flows)

        # bracket phase
        low, high = -0.999, 0.10
        f_low, f_high = f(low), f(high)

        tries = 0
        while f_low * f_high > 0 and tries < 50:
            high = high * 2.0 + 0.10
            if high > 1e6:
                break
            f_high = f(high)
            tries += 1

        tries = 0
        while f_low * f_high > 0 and tries < 50:
            low = -0.999999 + (low + 1.0) / 2.0
            f_low = f(low)
            tries += 1

        if f_low * f_high <= 0:
            for _ in range(120):
                mid = (low + high) / 2.0
                f_mid = f(mid)
                if abs(f_mid) < 1e-12:
                    return mid
                if f_low * f_mid <= 0:
                    high, f_high = mid, f_mid
                else:
                    low, f_low = mid, f_mid
            return (low + high) / 2.0

        # newton fallback
        def newton(seed: float) -> Optional[float]:
            r = seed
            for _ in range(80):
                f_r = f(r)
                if abs(f_r) < 1e-12:
                    return r
                h = 1e-6
                slope = (f(r + h) - f_r) / h
                if slope == 0 or math.isnan(slope) or math.isinf(slope):
                    return None
                r2 = r - f_r / slope
                if abs(r2 - r) < 1e-12:
                    return r2
                r = r2
            return None

        for seed in (0.1, 0.3, 0.5, -0.5, 1.0, 2.0):
            out = newton(seed)
            if out is not None and -0.9999 < out < 1e6:
                return out
        return None

    def _external_cash_flows_for_xirr(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal]]:
        t = Transaction
        amt = self._amount_sql(t)

        # Investor signs
        sign = case(
            (t.transaction_type == TransactionType.DEPOSIT, literal(-1)),
            (t.transaction_type == TransactionType.WITHDRAWAL, literal(+1)),
            (t.transaction_type == TransactionType.DIVIDEND, literal(+1)),
            (t.transaction_type == TransactionType.INTEREST, literal(+1)),
            (t.transaction_type == getattr(TransactionType, "FEE", TransactionType.DEPOSIT), literal(-1)),
            (t.transaction_type == getattr(TransactionType, "TAX", TransactionType.DEPOSIT), literal(-1)),
            else_=literal(0),
        )

        rows = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                (sign * amt).label("signed_amt"),
            )
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_([
                    TransactionType.DEPOSIT,
                    TransactionType.WITHDRAWAL,
                    TransactionType.DIVIDEND,
                    TransactionType.INTEREST,
                    getattr(TransactionType, "FEE", TransactionType.DEPOSIT),
                    getattr(TransactionType, "TAX", TransactionType.DEPOSIT),
                ]),
            )
            .order_by(func.date(t.timestamp).asc())
            .all()
        )

        flows: List[Tuple[date, Decimal]] = []
        for d, signed in rows:
            signed_dec = signed if isinstance(signed, Decimal) else D(str(signed or 0))
            flows.append((d, signed_dec))

        return flows

    def calculate_mwrr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        try:
            flows = self._external_cash_flows_for_xirr(portfolio_id, start_date, end_date)
            end_mv = self._valuation_as_of(portfolio_id, end_date)

            logger.info("MWRR window=%s..%s pid=%s flows=%s", start_date, end_date, portfolio_id,
                        [(d.isoformat(), float(v)) for d, v in flows])

            if end_mv is None:
                return D("0")
            if not flows:
                return D("0")

            flows = list(flows) + [(end_date, end_mv if isinstance(end_mv, Decimal) else D(str(end_mv)))]
            neg = any(cf < 0 for _, cf in flows)
            pos = any(cf > 0 for _, cf in flows)
            if not (neg and pos):
                return D("0")

            irr = self._xirr(flows)
            if irr is None or math.isnan(irr) or math.isinf(irr):
                return D("0")
            return D(str(irr))
        except Exception:
            logger.exception("MWRR failed")
            return D("0")

    # ---------------------------
    # Breakdown (reconciliation)
    # ---------------------------
    def _sum_signed(self, portfolio_id: int, start_date: date, end_date: date, types: List[TransactionType], sign_factor: int) -> Decimal:
        t = Transaction
        amt = self._amount_sql(t)
        val = (
            self.db.query(func.coalesce(func.sum(sign_factor * amt), literal(0)))
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_(types),
            )
            .scalar()
        )
        return val if isinstance(val, Decimal) else D(str(val or 0))

    def calculate_returns_breakdown(self, portfolio_id: int, start_date: date, end_date: date) -> Dict:
        start_val = self._valuation_as_of(portfolio_id, start_date)
        end_val = self._valuation_as_of(portfolio_id, end_date)
        if start_val is None or end_val is None:
            return {}

        deposits = self._sum_signed(portfolio_id, start_date, end_date, [TransactionType.DEPOSIT], +1)
        withdrawals = self._sum_signed(portfolio_id, start_date, end_date, [TransactionType.WITHDRAWAL], +1)
        net_external = deposits - withdrawals  # +deposit -withdrawal (TWR convention)

        dividends = self._sum_signed(portfolio_id, start_date, end_date, [TransactionType.DIVIDEND], +1)
        interest = self._sum_signed(portfolio_id, start_date, end_date, [TransactionType.INTEREST], +1)
        fees = self._sum_signed(
            portfolio_id, start_date, end_date, [getattr(TransactionType, "FEE", TransactionType.DEPOSIT)], +1
        )
        taxes = self._sum_signed(
            portfolio_id, start_date, end_date, [getattr(TransactionType, "TAX", TransactionType.DEPOSIT)], +1
        )

        total_pnl = (end_val - start_val) - net_external

        realized_approx = D("0")  # no lot engine here
        currency_effects = D("0")
        unrealized_residual = total_pnl - (realized_approx + dividends + interest - fees - taxes + currency_effects)

        return {
            "beginning_value": start_val,
            "ending_value": end_val,
            "cash_flows": {
                "deposits": deposits,
                "withdrawals": withdrawals,
                "net_external": net_external,
            },
            "income_expenses": {
                "dividends": dividends,
                "interest": interest,
                "fees": fees,
                "taxes": taxes,
            },
            "pnl": {
                "total_pnl_ex_flows": total_pnl,
                "realized_gains_approx": realized_approx,
                "unrealized_gains_residual": unrealized_residual,
                "currency_effects": currency_effects,
                "note_realized": "Realized gains require lot-level cost basis; set here to 0 (approx).",
            },
        }

    # ---------------------------
    # Aggregated for one period
    # ---------------------------
    def calculate_period_returns(self, portfolio_id: int, end_date: date, period: str) -> Dict:
        start_date = self.get_period_start_date(portfolio_id, end_date, period)
        if not start_date:
            return {}

        ttwr = self.calculate_ttwr(portfolio_id, start_date, end_date)
        ttwr_invested = self.calculate_ttwr_invested_only(portfolio_id, start_date, end_date)
        mwrr = self.calculate_mwrr(portfolio_id, start_date, end_date)
        breakdown = self.calculate_returns_breakdown(portfolio_id, start_date, end_date)

        return {
            "start_date": start_date,
            "end_date": end_date,
            "ttwr": ttwr,
            "ttwr_invested": ttwr_invested,
            "mwrr": mwrr,
            "breakdown": breakdown,
        }
