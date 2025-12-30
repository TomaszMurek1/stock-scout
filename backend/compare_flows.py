from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.valuation import PortfolioValuationDaily
from services.metrics_rules import TWR_SIGN_NET_EXTERNAL, TWR_SIGN_TRADES

def compare_flows():
    """
    Compare the flows used by Portfolio TTWR vs Invested TTWR
    to find why there's a -27% difference
    """
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        
        start_date = svc.get_period_start_date(pid, today, "ytd")
        eff_start = svc._get_valuation_at_date(pid, start_date).date
        
        print("=== COMPARING FLOW TYPES ===\n")
        
        # Get both flow types
        external_flows = svc._get_daily_flows(pid, TWR_SIGN_NET_EXTERNAL, eff_start, today)
        trade_flows = svc._get_daily_flows(pid, TWR_SIGN_TRADES, eff_start, today)
        
        print(f"External Flows (NET_EXTERNAL): {len(external_flows)} days with flows")
        print(f"Trade Flows (TRADES): {len(trade_flows)} days with flows")
        print()
        
        # Show the flows
        print("Date         | External Flow | Trade Flow    | Difference")
        print("-" * 60)
        
        all_dates = sorted(set(list(external_flows.keys()) + list(trade_flows.keys())))
        
        total_ext = D(0)
        total_trade = D(0)
        
        for d in all_dates:
            ext = external_flows.get(d, D(0))
            trade = trade_flows.get(d, D(0))
            diff = ext - trade
            
            total_ext += ext
            total_trade += trade
            
            if ext != 0 or trade != 0:
                print(f"{d} | {float(ext):13,.0f} | {float(trade):13,.0f} | {float(diff):10,.0f}")
        
        print("-" * 60)
        print(f"TOTALS       | {float(total_ext):13,.0f} | {float(total_trade):13,.0f} | {float(total_ext - total_trade):10,.0f}")
        print()
        
        # Now trace through what happens with these different flows
        print("\n=== IMPACT ON TTWR CALCULATION ===\n")
        
        # Get portfolio values
        pvd_rows = (
            db.query(PortfolioValuationDaily.date, PortfolioValuationDaily.total_value)
            .filter(
                PortfolioValuationDaily.portfolio_id == pid,
                PortfolioValuationDaily.date >= eff_start,
                PortfolioValuationDaily.date <= today,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        def calc_twr(flow_map):
            """Calculate TWR with given flows"""
            def _to_d(x):
                if x is None: return D(0)
                if isinstance(x, D): return x
                return D(str(x))
            
            rows = [(d, _to_d(tot), flow_map.get(d, D(0))) for d, tot in pvd_rows]
            return svc._chain_twr(rows)
        
        ttwr_ext = calc_twr(external_flows)
        ttwr_trade = calc_twr(trade_flows)
        
        print(f"TTWR with External Flows: {float(ttwr_ext) * 100:.2f}%")
        print(f"TTWR with Trade Flows: {float(ttwr_trade) * 100:.2f}%")
        print(f"Difference: {(float(ttwr_ext) - float(ttwr_trade)) * 100:.2f}%")
        print()
        
        # The key question: Which is correct for Portfolio-level TTWR?
        print("\n=== ANALYSIS ===\n")
        print("Portfolio TTWR should use NET_EXTERNAL flows (deposits/withdrawals)")
        print("because it measures total portfolio value changes.")
        print()
        print("Invested TTWR should use TRADES flows (buy/sell)")
        print("because it measures only invested capital changes.")
        print()
        print(f"External flows: {float(total_ext):,.0f} PLN (deposits)")
        print(f"Trade flows: {float(total_trade):,.0f} PLN (stock purchases)")
        print(f"Difference: {float(total_ext - total_trade):,.0f} PLN")
        print()
        print("This difference is cash that came from existing balance,")
        print("not from new deposits.")
        
    finally:
        db.close()

if __name__ == "__main__":
    compare_flows()
