from __future__ import annotations

import calendar
import math
import logging
from decimal import Decimal, getcontext
from datetime import date, datetime, timedelta
from numbers import Real
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy import case, func, literal
from sqlalchemy.orm import Session

from utils.portfolio_utils import serialize_breakdown
from database.portfolio import Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

from services.metrics_rules import (
    amount_sql,
    INVESTOR_SIGN,
    TWR_SIGN_NET_EXTERNAL,
    TWR_SIGN_TRADES,
)

logger = logging.getLogger("stockscout.metrics")

# High precision for calculation
getcontext().prec = 28
D = Decimal
PERIODS = ["1d", "1w", "1m", "3m", "6m", "1y", "ytd", "itd"]


def _to_d(x: Any) -> Decimal:
    """Safe Decimal conversion helper."""
    if x is None:
        return D("0")
    if isinstance(x, Decimal):
        return x
    return D(str(x))


def _dt_end_of_day(d: date) -> datetime:
    """End of day timestamp for inclusive filtering."""
    return datetime.combine(d, datetime.max.time())


class PortfolioMetricsService:
    """
    Service for calculating portfolio performance metrics:
    - Time-Weighted Return (TTWR)
    - Money-Weighted Return (MWRR/XIRR)
    - PnL Breakdowns (Cash vs Invested)
    """

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Date & Period Helpers
    # =========================================================================

    def _subtract_months(self, d: date, months: int) -> date:
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

        # Default fallback
        return end_date - timedelta(days=30)
    
    # =========================================================================
    # Data Fetching: Valuations & Flows
    # =========================================================================

    def _get_valuation_at_date(self, portfolio_id: int, day: date) -> Optional[PortfolioValuationDaily]:
        """Fetch the specific valuation record for a given date (or latest prior)."""
        return (
            self.db.query(PortfolioValuationDaily)
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date <= day,
            )
            .order_by(PortfolioValuationDaily.date.desc())
            .first()
        )

    def _get_total_value(self, portfolio_id: int, day: date) -> Decimal:
        val = self._get_valuation_at_date(portfolio_id, day)
        return _to_d(val.total_value) if val else D("0")

    def _get_daily_flows(
        self,
        portfolio_id: int,
        type_to_sign: Dict[TransactionType, int],
        start: date,
        end: date,
    ) -> Dict[date, Decimal]:
        """
        Groups signed transaction amounts by day for the period (start, end].
        Note: Strict inequality (> start) excludes start_date itself.
        """
        t = Transaction
        amt = amount_sql(t)

        when_clauses = [
            (t.transaction_type == typ, (sign if sign != 0 else 0) * amt)
            for typ, sign in type_to_sign.items()
            if typ is not None
        ]
        signed_expr = case(*when_clauses, else_=literal(0)) if when_clauses else literal(0)

        rows = (
            self.db.query(
                func.date(t.timestamp).label("d"),
                func.sum(signed_expr),
            )
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp > _dt_end_of_day(start),
                t.timestamp <= _dt_end_of_day(end),
                t.transaction_type.in_([k for k in type_to_sign if k is not None]),
            )
            .group_by("d")
            .all()
        )
        return {d: _to_d(v) for d, v in rows}

    def _sum_flows(
        self,
        portfolio_id: int,
        start: date,
        end: date,
        types: List[TransactionType],
        sign_factor: int = 1,
    ) -> Decimal:
        """Sums signed amounts for specific transaction types over (start, end]."""
        t = Transaction
        amt = amount_sql(t)
        
        val = (
            self.db.query(func.coalesce(func.sum(sign_factor * amt), literal(0)))
            .filter(
                t.portfolio_id == portfolio_id,
                t.timestamp > _dt_end_of_day(start),
                t.timestamp <= _dt_end_of_day(end),
                t.transaction_type.in_(types),
            )
            .scalar()
        )
        return _to_d(val)

    # =========================================================================
    # Calculation Engine: TWR & MWRR
    # =========================================================================

    def _chain_twr(self, rows: List[Tuple[date, Decimal, Decimal]]) -> Decimal:
        """
        Calculates TWR by chaining daily returns.
        rows element: (date, end_value, flow_during_day)
        """
        if len(rows) < 2:
            return D("0")
            
        product = D("1")
        prev_mv = rows[0][1] # Start Value
        
        for i in range(1, len(rows)):
            _, curr_mv, flow = rows[i]
            if prev_mv == 0:
                prev_mv = curr_mv
                continue
            
            # Dietz / TWR formula for single sub-period
            # We use "Start of Day" flow assumption to handle large inflows responsibly.
            # Denom = Start + Flow.
            denom = prev_mv + flow
            
            if denom == 0:
                 # If base is zero, return is undefined (or 0)
                 r_t = D("0")
            else:
                 r_t = (curr_mv - denom) / denom
                 
            product *= (D("1") + r_t)
            prev_mv = curr_mv
            
        return product - D("1")

    def _xirr_solver(self, flows: List[Tuple[date, Decimal]]) -> Decimal:
        """Solves XIRR using Secant/Newton method."""
        if not flows:
            return D("0")

        # Convert to float for solver speed
        fflows = [(d, float(v)) for d, v in flows]
        t0 = fflows[0][0]

        def xnpv(rate, date_flows):
            acc = 0.0
            base = 1.0 + rate
            for d, cf in date_flows:
                days = (d - t0).days
                acc += cf / (base ** (days / 365.0))
            return acc

        def solve(guess):
            r = guess
            for _ in range(50):
                v = xnpv(r, fflows)
                if abs(v) < 1e-5:
                    return r
                
                # Numeric derivative (secant)
                d = 1e-5
                v_d = xnpv(r + d, fflows)
                derivative = (v_d - v) / d
                
                if abs(derivative) < 1e-10:
                    return None
                    
                new_r = r - v / derivative
                if abs(new_r - r) < 1e-5:
                    return new_r
                r = new_r
            return None

        # Try multiple guesses
        for guess in [0.1, -0.1, 0.5, -0.5, 0.0]:
            try:
                res = solve(guess)
                if res and -0.999 < res < 100: # Rational bounds
                    return D(str(res))
            except Exception:
                continue

        return D("0")

    # =========================================================================
    # Public Metrics Methods
    # =========================================================================

    def calculate_ttwr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        """Calculates Time-Weighted Return."""
        # Anchor to known valuations
        eff_start_date = self._get_valuation_at_date(portfolio_id, start_date)
        eff_start = eff_start_date.date if eff_start_date else start_date
        
        # 1. Fetch Daily Valuations
        pvd_rows = (
            self.db.query(PortfolioValuationDaily.date, PortfolioValuationDaily.total_value)
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= eff_start,
                PortfolioValuationDaily.date <= end_date,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        # 2. Fetch External Flows (Deposits/Withdrawals)
        flow_map = self._get_daily_flows(portfolio_id, TWR_SIGN_NET_EXTERNAL, eff_start, end_date)
        
        # 3. Combine
        rows = []
        for d, tot in pvd_rows:
            rows.append((d, _to_d(tot), flow_map.get(d, D("0"))))
            
        return self._chain_twr(rows)

    def calculate_ttwr_invested_only(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        """Calculates TWR for Invested Capital (removing Cash Drag)."""
        eff_start_date = self._get_valuation_at_date(portfolio_id, start_date)
        eff_start = eff_start_date.date if eff_start_date else start_date
        
        # Logic: Invested Value = Total - Cash
        invested_col = (
            func.coalesce(PortfolioValuationDaily.total_value, 0) - 
            func.coalesce(PortfolioValuationDaily.by_cash, 0)
        )
        
        pvd_rows = (
            self.db.query(PortfolioValuationDaily.date, invested_col)
            .filter(
                PortfolioValuationDaily.portfolio_id == portfolio_id,
                PortfolioValuationDaily.date >= eff_start,
                PortfolioValuationDaily.date <= end_date,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        # Flows for Invested TWR are Trades (Buy/Sell)
        flow_map = self._get_daily_flows(portfolio_id, TWR_SIGN_TRADES, eff_start, end_date)
        
        rows = []
        for d, val in pvd_rows:
            rows.append((d, _to_d(val), flow_map.get(d, D("0"))))
            
        return self._chain_twr(rows)

    def calculate_mwrr(self, portfolio_id: int, start_date: date, end_date: date) -> Decimal:
        """Calculates Money-Weighted Return (XIRR)."""
        # 1. Initial Value (Negative Cash Flow)
        start_val = self._get_total_value(portfolio_id, start_date)
        
        # 2. External Flows during period
        raw_flows = self._get_daily_flows(portfolio_id, INVESTOR_SIGN, start_date, end_date)
        
        # 3. End Value (Positive Cash Flow)
        end_val = self._get_total_value(portfolio_id, end_date)
        
        xirr_flows = []
        if start_val > 0:
            xirr_flows.append((start_date, -start_val))
        
        for d, amt in raw_flows.items():
            xirr_flows.append((d, amt))
            
        if end_val > 0:
            xirr_flows.append((end_date, end_val))
            
        return self._xirr_solver(xirr_flows)

    def calculate_returns_breakdown(self, portfolio_id: int, start_date: date, end_date: date) -> Dict:
        """Generates detailed PnL decomposition (Cash, Invested, Flows)."""
        start_pvd = self._get_valuation_at_date(portfolio_id, start_date)
        end_pvd = self._get_valuation_at_date(portfolio_id, end_date)
        
        if not start_pvd or not end_pvd:
            return {}

        # Safe Decimals
        start_val = _to_d(start_pvd.total_value)
        end_val = _to_d(end_pvd.total_value)
        start_cash = _to_d(start_pvd.by_cash)
        end_cash = _to_d(end_pvd.by_cash)
        
        # Derive
        start_invested = start_val - start_cash
        end_invested = end_val - end_cash

        # Sum components
        deposits = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.DEPOSIT])
        withdrawals = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.WITHDRAWAL])
        net_external = deposits - withdrawals

        dividends = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.DIVIDEND])
        interest = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.INTEREST])
        fees = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.FEE])
        taxes = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.TAX])

        # Core PnL math
        total_pnl = (end_val - start_val) - net_external

        # Invested Logic
        buys = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.BUY])
        sells = self._sum_flows(portfolio_id, start_date, end_date, [TransactionType.SELL])
        net_trades = buys - sells
        
        # Invested PnL = Change in Invested Capital - Net Injection of Capital (Buys - Sells)
        invested_pnl = (end_invested - start_invested) - net_trades
        
        # Simple Return % = Capital Gains / (Beginning Invested + Net Trades)
        # This answers: "What % did my capital grow, accounting for new money added?"
        simple_return_base = start_invested + net_trades
        simple_return_pct = (invested_pnl / simple_return_base) if simple_return_base != 0 else D("0")

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
                "invested_pnl": invested_pnl, # Renamed for clarity vs "capital_gains"
                "realized_gains_approx": D("0"), # Placeholder
                "unrealized_gains_residual": total_pnl - invested_pnl, # Rough internal check
                "currency_effects": D("0")
            },
            "invested": {
                "beginning_value": start_invested,
                "ending_value": end_invested,
                "net_trades": net_trades,
                "capital_gains": invested_pnl,
                "simple_return_pct": simple_return_pct,  # NEW: Simple % return
            }
        }

    def build_performance_summary(
        self,
        portfolio_id: int,
        end_date: date,
        include_all_breakdowns: bool = False
    ) -> Dict:
        """Returns the full dashboard performance card data."""
        ttwr_map = {}
        inv_map = {}
        mwrr_map = {}
        start_dates = {}
        end_dates = {}
        breakdowns = {}
        
        ALWAYS_BREAKDOWN = {"ytd", "itd"}

        for p in PERIODS:
            start = self.get_period_start_date(portfolio_id, end_date, p)
            if not start:
                continue
                
            ttwr = self.calculate_ttwr(portfolio_id, start, end_date)
            ttwr_invested = self.calculate_ttwr_invested_only(portfolio_id, start, end_date)
            mwrr = self.calculate_mwrr(portfolio_id, start, end_date)
            
            ttwr_map[p] = float(ttwr)
            inv_map[p] = float(ttwr_invested)
            mwrr_map[p] = float(mwrr)
            
            if include_all_breakdowns or p in ALWAYS_BREAKDOWN:
                bd = self.calculate_returns_breakdown(portfolio_id, start, end_date)
                breakdowns[p] = serialize_breakdown(bd)
                start_dates[p] = start.isoformat()
                end_dates[p] = end_date.isoformat()

        result = {
            "portfolio_id": portfolio_id,
            "as_of_date": end_date.isoformat(),
            "performance": {
                "ttwr": ttwr_map,
                "ttwr_invested": inv_map,
                "mwrr": mwrr_map,
            }
        }
        
        if breakdowns:
            result["period_meta"] = {
                "start_date": start_dates,
                "end_date": end_dates,
            }
            result["breakdowns"] = breakdowns

        return result
