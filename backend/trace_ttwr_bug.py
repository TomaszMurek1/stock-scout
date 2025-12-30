from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.valuation import PortfolioValuationDaily
from services.metrics_rules import TWR_SIGN_NET_EXTERNAL

def trace_portfolio_ttwr_bug():
    """
    Trace the exact calculation to find where -3.20% comes from
    Focus on Nov 15-20 when the deposits happened
    """
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        
        start_date = svc.get_period_start_date(pid, today, "ytd")
        eff_start = svc._get_valuation_at_date(pid, start_date).date
        
        # Get the data
        pvd_rows = (
            db.query(PortfolioValuationDaily)
            .filter(
                PortfolioValuationDaily.portfolio_id == pid,
                PortfolioValuationDaily.date >= eff_start,
                PortfolioValuationDaily.date <= today,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        ext_flows = svc._get_daily_flows(pid, TWR_SIGN_NET_EXTERNAL, eff_start, today)
        
        print("=== DETAILED TRACE: Nov 13-22 (Deposit Period) ===\n")
        print(f"{'Date':<12} | {'Total Val':>12} | {'Cash':>12} | {'Invested':>12} | {'Ext Flow':>12} | {'Daily Ret':>10}")
        print("-" * 95)
        
        def _to_d(x):
            if x is None: return D(0)
            if isinstance(x, D): return x
            return D(str(x))
        
        prev_total = None
        prev_flow = D(0)
        cumulative_product = D(1)
        
        for pvd in pvd_rows:
            if pvd.date < date(2025, 11, 13):
                continue
            if pvd.date > date(2025, 11, 22):
                break
                
            curr_total = _to_d(pvd.total_value)
            curr_cash = _to_d(pvd.by_cash)
            curr_inv = curr_total - curr_cash
            flow = ext_flows.get(pvd.date, D(0))
            
            if prev_total is not None and prev_total > 0:
                # This is the formula from _chain_twr with "Start of Day" assumption
                denom = prev_total + flow
                if denom != 0:
                    r_t = (curr_total - denom) / denom
                    cumulative_product *= (D(1) + r_t)
                    daily_ret = float(r_t) * 100
                else:
                    daily_ret = 0
            else:
                daily_ret = 0
            
            print(f"{pvd.date} | {float(curr_total):12,.0f} | {float(curr_cash):12,.0f} | "
                  f"{float(curr_inv):12,.0f} | {float(flow):12,.0f} | {daily_ret:9.2f}%")
            
            prev_total = curr_total
            prev_flow = flow
        
        print("-" * 95)
        print(f"\nPartial TTWR (Nov 13-22): {(cumulative_product - 1) * 100:.2f}%")
        print()
        
        # Now show what SHOULD happen
        print("\n=== WHAT SHOULD HAPPEN ===\n")
        print("Nov 15: No deposit, stocks perform → Normal return calculation")
        print("Nov 16: DEPOSIT 100k → total_value jumps 100k")
        print("   Formula: (145k - (45k + 100k)) / (45k + 100k) = 0 / 145k = 0%")
        print("   This is CORRECT - deposit doesn't create returns")
        print()
        print("Nov 17: BUY 60k stocks → total_value unchanged (cash → stocks)")
        print("   Formula: (145k - 145k) / 145k = 0%")
        print("   This is CORRECT")
        print()
        print("So why is Portfolio TTWR negative overall?")
        print("Let me check if there's something wrong with the full year calculation...")
        
    finally:
        db.close()

if __name__ == "__main__":
    trace_portfolio_ttwr_bug()
