from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.valuation import PortfolioValuationDaily
from services.metrics_rules import TWR_SIGN_NET_EXTERNAL

def debug_portfolio_ttwr():
    """
    Debug why Portfolio TTWR is -3.20% instead of expected ~+7%
    
    Expected: 69.6% cash (0%) + 30.4% stocks (+23.87%) = +7.26%
    Actual: -3.20%
    Gap: -10.4%
    """
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        
        start_date = svc.get_period_start_date(pid, today, "ytd")
        eff_start = svc._get_valuation_at_date(pid, start_date).date
        
        print(f"DEBUG PORTFOLIO TTWR YTD: {eff_start} -> {today}\n")
        
        # Get the data used for TTWR calculation
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
        
        ext_flow_map = svc._get_daily_flows(pid, TWR_SIGN_NET_EXTERNAL, eff_start, today)
        
        print(f"Total days: {len(pvd_rows)}")
        print(f"External flows (deposits): {sum([float(v) for v in ext_flow_map.values()]):,.0f} PLN")
        print()
        
        # Manually calculate TTWR
        def _to_d(x):
            if x is None: return D(0)
            if isinstance(x, D): return x
            return D(str(x))
        
        port_rows = []
        for d, tot in pvd_rows:
            port_rows.append((d, _to_d(tot), ext_flow_map.get(d, D(0))))
        
        # Show sample of rows
        print("Sample of calculation rows:")
        print(f"{'Date':<12} | {'Total Value':>12} | {'Flow':>12} | {'Daily Ret %':>12}")
        print("-" * 60)
        
        prev_mv = None
        product = D(1)
        
        suspicious_days = []
        
        for i, (d, curr_mv, flow) in enumerate(port_rows):
            if prev_mv is not None and prev_mv > 0:
                denom = prev_mv + flow
                if denom != 0:
                    r_t = (curr_mv - denom) / denom
                    product *= (D("1") + r_t)
                    
                    # Print every 30 days
                    if i % 30 == 0 or abs(float(r_t)) > 0.05:
                        print(f"{d} | {float(curr_mv):12,.0f} | {float(flow):12,.0f} | {float(r_t) * 100:11.2f}%")
                        
                    # Track suspicious days
                    if abs(float(r_t)) > 0.05:
                        suspicious_days.append((d, float(r_t) * 100, float(flow)))
            
            prev_mv = curr_mv
        
        final_ttwr = (product - 1) * 100
        
        print("-" * 60)
        print(f"\nFinal Portfolio TTWR: {float(final_ttwr):.2f}%")
        print()
        
        # Show suspicious days
        if suspicious_days:
            print("\n=== SUSPICIOUS DAYS (>5% daily change) ===\n")
            for d, ret, flow in suspicious_days:
                print(f"{d}: {ret:+.2f}% (flow: {flow:,.0f})")
        
        # Compare to invested TTWR
        ttwr_inv = svc.calculate_ttwr_invested_only(pid, start_date, today)
        print(f"\n=== COMPARISON ===")
        print(f"Portfolio TTWR: {float(final_ttwr):.2f}%")
        print(f"Invested TTWR: {float(ttwr_inv) * 100:.2f}%")
        print(f"Gap: {float(final_ttwr) - float(ttwr_inv) * 100:.2f}%")
        
        # Check for data issues
        print(f"\n=== DATA QUALITY CHECK ===")
        missing_days = 0
        prev_date = None
        for d, _, _ in port_rows:
            if prev_date:
                days_gap = (d - prev_date).days
                if days_gap > 1:
                    missing_days += days_gap - 1
            prev_date = d
        
        print(f"Missing days in timeline: {missing_days}")
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_portfolio_ttwr()
