# services/portfolio_metrics_service.py
from __future__ import annotations
import math
import calendar
from decimal import Decimal, ROUND_HALF_UP, getcontext, InvalidOperation
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional, Dict

from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal

from database.portfolio import Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

getcontext().prec = 28
D = Decimal


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

    # ----- Overall portfolio: rows + external flows (deposits/withdrawals) -----
    def _daily_external_flows_map(self, portfolio_id: int, start_date: date, end_date: date) -> Dict[date, Decimal]:
        """
        External flows for portfolio-level TTWR: ONLY DEPOSIT/WITHDRAWAL.
        Sign convention (TWR flow_t): net_contrib_t = +deposit - withdrawal
        """
        q = (
            self.db.query(
                func.date(Transaction.timestamp).label("d"),
                func.sum(
                    Transaction.quantity * func.coalesce(Transaction.currency_rate, literal(1))
                ),
            )
            .filter(
                Transaction.portfolio_id == portfolio_id,
                Transaction.timestamp >= datetime.combine(start_date, datetime.min.time()),
                Transaction.timestamp <= datetime.combine(end_date, datetime.max.time()),
                Transaction.transaction_type.in_([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]),
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
        """
        Returns ordered rows: (date, total_value, external_flow_for_TWR_on_that_date)
        """
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

    # ----- Invested-only sleeve: rows + trade flows (buys/sells) -----
    def _invested_expression(self):
        # Prefer explicit columns if present: by_stock/by_etf/by_bond/by_crypto/by_commodity
        cols = []
        for c in ("by_stock", "by_etf", "by_bond", "by_crypto", "by_commodity"):
            if hasattr(PortfolioValuationDaily, c):
                cols.append(func.coalesce(getattr(PortfolioValuationDaily, c), literal(0)))
        if cols:
            expr = cols[0]
            for c in cols[1:]:
                expr = expr + c
            return expr.label("invested_mv")

        # Fallback: total_value - cash_balance if available
        if hasattr(PortfolioValuationDaily, "cash_balance"):
            return (func.coalesce(PortfolioValuationDaily.total_value, literal(0)) -
                    func.coalesce(PortfolioValuationDaily.cash_balance, literal(0))).label("invested_mv")

        # Last resort: use total_value (not ideal, but keeps endpoint alive)
        return func.coalesce(PortfolioValuationDaily.total_value, literal(0)).label("invested_mv")

    def _rows_from_pvd_invested(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal, Decimal]]:
        """
        Returns ordered rows: (date, invested_market_value, trade_flow_for_TWR_on_that_date)
        For invested sleeve, BUY/SELL are treated as flows to neutralize trading activity.
        """
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

        # Trade flows: BUY (+), SELL (-) in base CCY
        amount_base = (
            func.coalesce(getattr(Transaction, "total_value", None), literal(None))
        )
        if amount_base is None:
            amount_base = (Transaction.quantity * func.coalesce(Transaction.price, literal(0)))

        amount_base = amount_base * func.coalesce(Transaction.currency_rate, literal(1))

        sign = case(
            (Transaction.transaction_type == TransactionType.BUY, literal(1)),
            (Transaction.transaction_type == TransactionType.SELL, literal(-1)),
            else_=literal(0),
        )

        q = (
            self.db.query(
                func.date(Transaction.timestamp).label("d"),
                func.sum(sign * amount_base),
            )
            .filter(
                Transaction.portfolio_id == portfolio_id,
                Transaction.timestamp >= datetime.combine(start_date, datetime.min.time()),
                Transaction.timestamp <= datetime.combine(end_date, datetime.max.time()),
                Transaction.transaction_type.in_([TransactionType.BUY, TransactionType.SELL]),
            )
            .group_by("d")
            .all()
        )

        trade_flow_map: Dict[date, Decimal] = {d: self._dec(v or 0) for d, v in q}

        out: List[Tuple[date, Decimal, Decimal]] = []
        for d, inv_mv in rows:
            out.append((d, self._dec(inv_mv), trade_flow_map.get(d, D("0"))))
        return out

    # ----- Chain function used by both portfolio and invested-only -----
    @staticmethod
    def _chain_twr(rows: List[Tuple[date, Decimal, Decimal]]) -> Optional[Decimal]:
        """
        r_t = (MV_t - (MV_{t-1} + flow_t)) / MV_{t-1}
        flow_t:
          - portfolio-level: external flows only (deposit/withdrawal)
          - invested-only: trade flows only (buy/sell)
        """
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

    # ========== Public: TTWR ==========
    def calculate_ttwr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        effective_end = self._last_valuation_on_or_before(portfolio_id, end_date) or end_date
        rows = self._rows_from_pvd_portfolio(portfolio_id, start_date, effective_end)
        twr = self._chain_twr(rows)
        return twr if twr is not None else D("0")

    def calculate_ttwr_invested_only(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        """
        “True investment performance”: excludes cash drag.
        Uses invested MV (stocks/etf/bond/crypto/commodity) and treats BUY/SELL as flows.
        """
        effective_end = self._last_valuation_on_or_before(portfolio_id, end_date) or end_date
        rows = self._rows_from_pvd_invested(portfolio_id, start_date, effective_end)
        twr = self._chain_twr(rows)
        return twr if twr is not None else D("0")

    # ========== Public: MWRR / XIRR ==========
    def _external_cash_flows_for_xirr(self, portfolio_id: int, start_date: date, end_date: date) -> List[Tuple[date, Decimal]]:
        """
        Investor money-weighted cash flows in base CCY with investor-centric signs:
          Deposits -> negative (investor pays in)
          Withdrawals -> positive (investor receives)
          Dividends/Interest -> positive (investor receives)
          Fees/Taxes -> negative (investor pays)
        """
        q = (
            self.db.query(Transaction)
            .filter(
                Transaction.portfolio_id == portfolio_id,
                Transaction.timestamp >= datetime.combine(start_date, datetime.min.time()),
                Transaction.timestamp <= datetime.combine(end_date, datetime.max.time()),
                Transaction.transaction_type.in_(
                    [
                        TransactionType.DEPOSIT,
                        TransactionType.WITHDRAWAL,
                        TransactionType.DIVIDEND,
                        TransactionType.INTEREST,
                        TransactionType.FEE,
                        TransactionType.TAX,
                    ]
                ),
            )
            .all()
        )
        flows: List[Tuple[date, Decimal]] = []
        for t in q:
            # base amount
            if hasattr(t, "total_value") and t.total_value is not None:
                base_amt = self._dec(t.total_value) * self._dec(getattr(t, "currency_rate", 1) or 1)
            elif getattr(t, "price", None) is not None:
                base_amt = self._dec(t.quantity) * self._dec(t.price) * self._dec(getattr(t, "currency_rate", 1) or 1)
            else:
                base_amt = self._dec(t.quantity) * self._dec(getattr(t, "currency_rate", 1) or 1)

            d = t.timestamp.date()
            tt = t.transaction_type

            if tt == TransactionType.DEPOSIT:
                flows.append((d, -base_amt))
            elif tt == TransactionType.WITHDRAWAL:
                flows.append((d, +base_amt))
            elif tt in (TransactionType.DIVIDEND, TransactionType.INTEREST):
                flows.append((d, +base_amt))
            elif tt in (TransactionType.FEE, TransactionType.TAX):
                flows.append((d, -base_amt))
        flows.sort(key=lambda x: x[0])
        return flows

    # -- float-based XNPV to avoid Decimal ** (fractional exponent) errors
    @staticmethod
    def _xnpv_float(rate: float, flows: List[Tuple[date, Decimal]]) -> float:
        t0 = flows[0][0]
        acc = 0.0
        base = 1.0 + float(rate)
        for d, cf in flows:
            days = (d - t0).days
            acc += float(cf) / (base ** (days / 365.0))
        return acc

    def _xirr_robust(self, flows: List[Tuple[date, Decimal]]) -> Optional[float]:
        """
        Bracket + bisection XIRR in float space.
        Requires at least one negative and one positive cash flow (incl. terminal MV).
        """
        if not flows or len(flows) < 2:
            return None
        if not any(cf < 0 for _, cf in flows) or not any(cf > 0 for _, cf in flows):
            return None

        f = lambda r: self._xnpv_float(r, flows)

        # Start with a broad bracket and expand high until sign changes or limit hit
        low, high = -0.999, 0.10  # common starting bracket
        f_low, f_high = f(low), f(high)

        expand_steps = 0
        while f_low * f_high > 0 and expand_steps < 40:
            # Expand high exponentially
            high = high * 2.0 + 0.10
            if high > 1e6:
                break
            f_high = f(high)
            expand_steps += 1

        if f_low * f_high > 0:
            # Could not bracket a root; return None -> later converted to 0
            return None

        # Bisection
        for _ in range(80):
            mid = (low + high) / 2.0
            f_mid = f(mid)
            if abs(f_mid) < 1e-12:
                return mid
            if f_low * f_mid <= 0:
                high, f_high = mid, f_mid
            else:
                low, f_low = mid, f_mid

        return (low + high) / 2.0

    def calculate_mwrr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        """
        XIRR on external flows + terminal MV, returned as a fraction (e.g. 0.035 = 3.5%).
        For windows with no external flows (e.g., 1w with no deposits/withdrawals/div/fees),
        MWRR is undefined; we return 0.
        """
        try:
            flows = self._external_cash_flows_for_xirr(portfolio_id, start_date, end_date)
            end_mv = self._valuation_as_of(portfolio_id, end_date)
            if end_mv is None:
                return D("0")

            flows = list(flows) + [(end_date, self._dec(end_mv))]

            # Robust float-based solver
            irr_float = self._xirr_robust(flows)
            return D(str(irr_float)) if irr_float is not None else D("0")
        except Exception:
            return D("0")

    # ========== Components & Breakdown ==========
    def _sum_amount_for_types(self, portfolio_id: int, start_date: date, end_date: date, types: List[TransactionType]) -> Decimal:
        """
        Sums base-CCY amounts for the given transaction types.
        Uses (total_value or quantity*price) * currency_rate if available, else quantity * currency_rate.
        """
        t = Transaction
        amount_base = func.coalesce(getattr(t, "total_value", None), literal(None))
        if amount_base is None:
            amount_base = (t.quantity * func.coalesce(t.price, literal(0)))
        amount_base = amount_base * func.coalesce(t.currency_rate, literal(1))

        val = (
            self.db.query(func.coalesce(func.sum(amount_base), literal(0)))
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
        """
        Reconciling breakdown:
          total_pnl = EndMV - StartMV - NetExternalFlows
                    = (realized_approx + unrealized_residual + dividends + interest - fees - taxes + currency_effects)
        We compute dividends/interest/fees/taxes exactly by sum; realized_approx=0 by default
        (lot-level realized requires cost-basis tracking). Unrealized is the residual to reconcile.
        """
        start_val = self._valuation_as_of(portfolio_id, start_date)
        end_val = self._valuation_as_of(portfolio_id, end_date)
        if start_val is None or end_val is None:
            return {}

        deposits = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.DEPOSIT])
        withdrawals = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.WITHDRAWAL])
        net_external = deposits - withdrawals  # same convention as TTWR flow (+deposit, -withdrawal)

        dividends = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.DIVIDEND])
        interest = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.INTEREST])
        fees = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.FEE])
        taxes = self._sum_amount_for_types(portfolio_id, start_date, end_date, [TransactionType.TAX])

        total_pnl = end_val - start_val - net_external

        # Without lot tracking, we cannot compute realized PnL accurately.
        # Keep it zero (or wire to a 'realized_pnl' column if you store it on SELL).
        realized_approx = D("0")

        currency_effects = D("0")  # placeholder; needs FX attribution logic if multi-ccy
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

    # ========== Aggregated calculation for a period ==========
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
