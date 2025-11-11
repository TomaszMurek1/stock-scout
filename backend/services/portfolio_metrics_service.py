# services/portfolio_metrics_service.py
from __future__ import annotations

import calendar
import math
import logging
from decimal import Decimal, getcontext, InvalidOperation
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal
from sqlalchemy.inspection import inspect as sa_inspect

from database.portfolio import Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

# Precision for Decimal
getcontext().prec = 28
D = Decimal

# Logger
logger = logging.getLogger("stockscout.metrics.mwrr")


class PortfolioMetricsService:
    def __init__(self, db: Session):
        self.db = db

    # ---------------------------
    # Generic helpers
    # ---------------------------
    @staticmethod
    def _dec(x) -> Decimal:
        if isinstance(x, Decimal):
            return x
        try:
            return D(str(x))
        except (InvalidOperation, TypeError, ValueError):
            return D("0")

    # ========== Period helpers ==========
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

        # default when unknown
        return end_date - timedelta(days=30)

    # ========== Valuation helpers ==========
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
        return self._dec(row[0]) if row else None

    # ---------- SQL expression helpers ----------
    
    def _sql_amount_expr(self, t_alias=None):
        """
        Build amount * rate in SQL with a wide COALESCE, **skipping zeros** so that
        deposits recorded as quantity with price=0 fall through to `quantity`.
        """
        from sqlalchemy import literal
        from sqlalchemy import func

        t = t_alias or Transaction

        # helper: treat 0 as NULL so COALESCE can fall through
        def nz(expr):
            return func.nullif(expr, literal(0))

        # ---- amount candidates (first non-NULL/non-zero wins) ----
        amount_expr = func.coalesce(
            nz(getattr(t, "total_value", literal(None))),
            nz(getattr(t, "amount", literal(None))),
            nz(getattr(t, "value", literal(None))),
            nz(getattr(t, "gross_amount", literal(None))),
            nz(getattr(t, "net_amount", literal(None))),
            nz(getattr(t, "cash_amount", literal(None))),
            nz(getattr(t, "proceeds", literal(None))),
            nz(getattr(t, "notional", literal(None))),
            nz(getattr(t, "money", literal(None))),
            nz(getattr(t, "total", literal(None))),
            nz(getattr(t, "sum", literal(None))),
            nz(getattr(t, "base_amount", literal(None))),
            nz(getattr(t, "amount_base", literal(None))),
            nz(getattr(t, "value_base", literal(None))),
            # quantity*price only if not zero
            nz(
                func.coalesce(getattr(t, "quantity", literal(0)), literal(0))
                * func.coalesce(getattr(t, "price", literal(0)), literal(0))
            ),
            # finally, fall back to raw quantity (works for deposits w/ price=0)
            nz(getattr(t, "quantity", literal(None))),
            literal(0),
        )

        # ---- FX side (no need to nullif 0; a 0 FX rate would be invalid anyway) ----
        rate_expr = func.coalesce(
            getattr(t, "currency_rate", literal(None)),
            getattr(t, "exchange_rate", literal(None)),
            getattr(t, "fx_rate", literal(None)),
            getattr(t, "rate", literal(None)),
            getattr(t, "fx", literal(None)),
            literal(1),
        )

        return amount_expr * rate_expr

    # ========== TTWR (portfolio level) ==========
    def _daily_external_flows_map(self, portfolio_id: int, start_date: date, end_date: date) -> Dict[date, Decimal]:
        """
        External flows for portfolio-level TTWR: ONLY DEPOSIT/WITHDRAWAL.
        Sign convention (TWR flow_t): net_contrib_t = +deposit - withdrawal
        """
        t = Transaction
        amount_rate_expr = self._sql_amount_expr(t)

        q = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                func.sum(amount_rate_expr),
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
        for d, amt in q:
            amt = self._dec(amt or 0)
            flows[d] = flows.get(d, D("0")) + amt
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
            out.append((d, self._dec(tot), flow_map.get(d, D("0"))))
        return out

    # ========== TTWR (invested-only) ==========
    def _invested_expression(self):
        cols = []
        for c in ("by_stock", "by_etf", "by_bond", "by_crypto", "by_commodity"):
            if hasattr(PortfolioValuationDaily, c):
                cols.append(func.coalesce(getattr(PortfolioValuationDaily, c), literal(0)))
        if cols:
            expr = cols[0]
            for c in cols[1:]:
                expr = expr + c
            return expr.label("invested_mv")

        if hasattr(PortfolioValuationDaily, "cash_balance"):
            return (func.coalesce(PortfolioValuationDaily.total_value, literal(0)) -
                    func.coalesce(PortfolioValuationDaily.cash_balance, literal(0))).label("invested_mv")

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
        amount_rate_expr = self._sql_amount_expr(t)
        sign = case(
            (t.transaction_type == TransactionType.BUY, literal(1)),
            (t.transaction_type == TransactionType.SELL, literal(-1)),
            else_=literal(0),
        )

        q = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                func.sum(sign * amount_rate_expr),
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

        trade_flow_map: Dict[date, Decimal] = {d: self._dec(v or 0) for d, v in q}

        out: List[Tuple[date, Decimal, Decimal]] = []
        for d, inv_mv in rows:
            out.append((d, self._dec(inv_mv), trade_flow_map.get(d, D("0"))))
        return out

    # ----- Chain function for TWR -----
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

    # ========== DEBUG UTIL ==========
    def _debug_dump_transactions(self, portfolio_id: int, start_date: date, end_date: date):
        """
        Dump ALL columns for transactions in window, for quick schema discovery.
        """
        t = Transaction
        txs = (
            self.db.query(t)
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_(
                    [
                        TransactionType.DEPOSIT,
                        TransactionType.WITHDRAWAL,
                        TransactionType.DIVIDEND,
                        TransactionType.INTEREST,
                        getattr(TransactionType, "FEE", TransactionType.INTEREST),
                        getattr(TransactionType, "TAX", TransactionType.INTEREST),
                    ]
                ),
            )
            .order_by(t.timestamp.asc())
            .all()
        )

        mapper = sa_inspect(Transaction)
        col_names = [c.key for c in mapper.columns]
        logger.info("[MWRR] DEBUG columns in `transactions`: %s", col_names)

        rows_dump = []
        for tx in txs:
            row = {}
            for name in col_names:
                try:
                    row[name] = getattr(tx, name)
                except Exception:
                    row[name] = "<error>"
            rows_dump.append(row)

        # Log compactly; FastAPI/Uvicorn will truncate if too long
        logger.info("[MWRR] DEBUG raw tx rows (%d): %s", len(rows_dump), rows_dump)

    # ========== MWRR / XIRR ==========
    @staticmethod
    def _xnpv_float(rate: float, flows: List[Tuple[date, Decimal]]) -> float:
        t0 = flows[0][0]
        acc = 0.0
        base = 1.0 + float(rate)
        for d, cf in flows:
            days = (d - t0).days
            acc += float(cf) / (base ** (days / 365.0))
        return acc

    def _try_bracket(self, flows: List[Tuple[date, Decimal]]) -> Optional[Tuple[float, float, float, float]]:
        f = lambda r: self._xnpv_float(r, flows)

        low, high = -0.999, 0.10
        f_low, f_high = f(low), f(high)
        logger.debug("[MWRR] initial bracket: low=%.6f NPV=%.6f, high=%.6f NPV=%.6f", low, f_low, high, f_high)

        steps = 0
        while f_low * f_high > 0 and steps < 50:
            high = high * 2.0 + 0.10
            if high > 1e6:
                break
            f_high = f(high)
            steps += 1
            logger.debug("[MWRR] expand up: high=%.6f NPV=%.6f", high, f_high)

        steps_down = 0
        while f_low * f_high > 0 and steps_down < 50:
            low = -0.999999 + (low + 1.0) / 2.0
            f_low = f(low)
            steps_down += 1
            logger.debug("[MWRR] expand down: low=%.9f NPV=%.6f", low, f_low)

        if f_low * f_high <= 0:
            logger.debug("[MWRR] bracket found: [%.9f, %.6f]", low, high)
            return low, high, f_low, f_high

        logger.debug("[MWRR] bracket not found")
        return None

    def _xirr_bisect_or_newton(self, flows: List[Tuple[date, Decimal]]) -> Optional[float]:
        br = self._try_bracket(flows)
        f = lambda r: self._xnpv_float(r, flows)

        if br is not None:
            low, high, f_low, f_high = br
            for _ in range(120):
                mid = (low + high) / 2.0
                f_mid = f(mid)
                if abs(f_mid) < 1e-12:
                    logger.debug("[MWRR] bisection converged: r=%.12f", mid)
                    return mid
                if f_low * f_mid <= 0:
                    high, f_high = mid, f_mid
                else:
                    low, f_low = mid, f_mid
            mid = (low + high) / 2.0
            logger.debug("[MWRR] bisection max iters: r=%.12f (NPV=%.6f)", mid, f(mid))
            return mid

        def newton(seed: float) -> Optional[float]:
            r = seed
            for _ in range(80):
                f_r = f(r)
                if abs(f_r) < 1e-12:
                    logger.debug("[MWRR] newton converged: seed=%.4f r=%.12f", seed, r)
                    return r
                h = 1e-6
                slope = (f(r + h) - f_r) / h
                if slope == 0 or math.isnan(slope) or math.isinf(slope):
                    return None
                r2 = r - f_r / slope
                if abs(r2 - r) < 1e-12:
                    logger.debug("[MWRR] newton epsilon: seed=%.4f r=%.12f", seed, r2)
                    return r2
                r = r2
            return None

        for seed in (0.1, 0.3, 0.5, -0.5, 1.0, 2.0):
            out = newton(seed)
            if out is not None and -0.9999 < out < 1e6:
                return out

        logger.debug("[MWRR] newton failed for all seeds")
        return None

    def _external_cash_flows_for_xirr(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal]]:
        """
        Build investor cash flows using a SQL-computed amount:
          COALESCE( ...many amount columns..., quantity*price, quantity) *
          COALESCE(currency_rate, exchange_rate, fx_rate, rate, fx, 1)
        Signs (investor convention):
          DEPOSIT -> negative
          WITHDRAWAL -> positive
          DIVIDEND/INTEREST -> positive
          FEE/TAX -> negative
        """
        t = Transaction
        amount_rate_expr = self._sql_amount_expr(t)

        rows = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                amount_rate_expr.label("amt"),
                t.transaction_type.label("tt"),
                getattr(t, "id", literal(None)).label("tx_id"),
            )
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_(
                    [
                        TransactionType.DEPOSIT,
                        TransactionType.WITHDRAWAL,
                        TransactionType.DIVIDEND,
                        TransactionType.INTEREST,
                        getattr(TransactionType, "FEE", TransactionType.INTEREST),
                        getattr(TransactionType, "TAX", TransactionType.INTEREST),
                    ]
                ),
            )
            .order_by(func.date(t.timestamp).asc(), getattr(t, "id", literal(0)).asc())
            .all()
        )

        flows: List[Tuple[date, Decimal]] = []
        debug_dump = []
        for d, amt, tt, tx_id in rows:
            amt_dec = self._dec(amt or 0)

            if tt == TransactionType.DEPOSIT:
                signed = -amt_dec
                sign_label = "- (deposit)"
            elif tt == TransactionType.WITHDRAWAL:
                signed = +amt_dec
                sign_label = "+ (withdrawal)"
            elif tt in (TransactionType.DIVIDEND, TransactionType.INTEREST):
                signed = +amt_dec
                sign_label = "+ (income)"
            else:
                if str(tt).lower().endswith("fee") or str(tt).lower().endswith("tax"):
                    signed = -amt_dec
                    sign_label = "- (expense)"
                else:
                    signed = amt_dec
                    sign_label = "~ (other)"

            flows.append((d, signed))
            debug_dump.append((d.isoformat(), float(amt_dec), str(tt), int(tx_id) if tx_id is not None else None, sign_label))

        # Log what SQL actually returned; if amounts are 0, we will dump raw rows too
        logger.info("[MWRR] SQL flow rows=%d -> %s", len(debug_dump), debug_dump)

        # If amounts are still 0.0, dump the raw tx rows with all columns for schema discovery
        if any(val == 0.0 for _, val, *_ in debug_dump) and rows:
            self._debug_dump_transactions(portfolio_id, start_date, end_date)

        flows.sort(key=lambda x: x[0])
        return flows

    def calculate_mwrr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        try:
            flows = self._external_cash_flows_for_xirr(portfolio_id, start_date, end_date)
            end_mv = self._valuation_as_of(portfolio_id, end_date)

            logger.info("[MWRR] window=%s..%s portfolio_id=%s", start_date, end_date, portfolio_id)
            logger.info("[MWRR] flows(before terminal) count=%d: %s", len(flows), [(d.isoformat(), float(v)) for d, v in flows])

            if end_mv is None:
                logger.warning("[MWRR] no valuation for end_date=%s -> return 0", end_date)
                return D("0")

            if not flows:
                logger.info("[MWRR] no external flows in window -> return 0")
                return D("0")

            flows = list(flows) + [(end_date, self._dec(end_mv))]
            logger.info("[MWRR] terminal MV at %s = %.6f", end_date, float(end_mv))

            neg = any(cf < 0 for _, cf in flows)
            pos = any(cf > 0 for _, cf in flows)
            if not (neg and pos):
                logger.info("[MWRR] flows do not have both signs -> return 0; flows=%s", [(d.isoformat(), float(v)) for d, v in flows])
                return D("0")

            irr_float = self._xirr_bisect_or_newton(flows)
            if irr_float is None or math.isnan(irr_float) or math.isinf(irr_float):
                logger.info("[MWRR] solver returned None/NaN/Inf -> return 0")
                return D("0")

            logger.info("[MWRR] result r=%.12f (fraction)", irr_float)
            return D(str(irr_float))

        except Exception as e:
            logger.exception("[MWRR] exception -> return 0: %s", e)
            return D("0")

    # ========== Components & Breakdown ==========
    def _sum_amount_for_types(self, portfolio_id: int, start_date: date, end_date: date, types: List[TransactionType]) -> Decimal:
        t = Transaction
        amount_rate_expr = self._sql_amount_expr(t)

        val = (
            self.db.query(func.coalesce(func.sum(amount_rate_expr), literal(0)))
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp >= datetime.combine(start_date, datetime.min.time()),
                t.timestamp <= datetime.combine(end_date, datetime.max.time()),
                t.transaction_type.in_(types),
            )
            .scalar()
        )
        return self._dec(val or 0)

    def calculate_returns_breakdown(self, portfolio_id: int, start_date: date, end_date: date) -> Dict:
        start_val = self._valuation_as_of(portfolio_id, start_date)
        end_val = self._valuation_as_of(portfolio_id, end_date)
        if start_val is None or end_val is None:
            return {}

        deposits = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.DEPOSIT])
        withdrawals = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.WITHDRAWAL])
        net_external = deposits - withdrawals  # +deposit -withdrawal (TWR convention)

        dividends = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.DIVIDEND])
        interest = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.INTEREST])
        fee_type = getattr(TransactionType, "FEE", None)
        tax_type = getattr(TransactionType, "TAX", None)
        fees = self._sum_amount_for_types(portfolio_id, start_date, end_date, [fee_type]) if fee_type else D("0")
        taxes = self._sum_amount_for_types(portfolio_id, start_date, end_date, [tax_type]) if tax_type else D("0")

        total_pnl = end_val - start_val - net_external

        realized_approx = D("0")  # until lot engine in place
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

    # ========== Aggregated ==========
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
