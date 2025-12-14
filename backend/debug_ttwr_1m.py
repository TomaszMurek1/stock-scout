from datetime import date, timedelta
from database.base import SessionLocal
import database.account # Register Account
import database.portfolio # Register Portfolio
from services.portfolio_metrics_service import PortfolioMetricsService

def debug_ttwr():
    db = SessionLocal()
    try:
        pid = 2  # Assuming portfolio 2 based on previous logs
        today = date.today()
        # 6M period
        svc = PortfolioMetricsService(db)
        start_date = svc.get_period_start_date(pid, today, "6m")
        
        print(f"DEBUG TTWR 6M: {start_date} -> {today}")
        
        eff_start = svc._get_valuation_at_date(pid, start_date).date
        print(f"Effective Start: {eff_start}")
        
        # Get Invested Rows
        from database.valuation import PortfolioValuationDaily
        from sqlalchemy import func
        from decimal import Decimal
        D = Decimal

        invested_col = (
            func.coalesce(PortfolioValuationDaily.total_value, 0) - 
            func.coalesce(PortfolioValuationDaily.by_cash, 0)
        )
        
        rows = (
            db.query(PortfolioValuationDaily.date, invested_col)
            .filter(
                PortfolioValuationDaily.portfolio_id == pid,
                PortfolioValuationDaily.date >= eff_start,
                PortfolioValuationDaily.date <= today,
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        from services.metrics_rules import TWR_SIGN_TRADES
        flow_map = svc._get_daily_flows(pid, TWR_SIGN_TRADES, eff_start, today)
        
        print(f"{'Date':<12} | {'Start Inv':<15} | {'Flow (Trades)':<15} | {'End Inv':<15} | {'Daily Ret %'}")
        print("-" * 80)
        
        prev_mv = rows[0][1] if rows else D(0)
        product = D(1)
        
        def _to_d(x):
            if x is None: return D(0)
            if isinstance(x, D): return x
            return D(str(x))

        for i in range(1, len(rows)):
            d, curr_mv = rows[i]
            curr_mv = _to_d(curr_mv)
            prev_mv = _to_d(prev_mv)
            flow = flow_map.get(d, D(0))
            
            denom = prev_mv + flow
            if denom == 0:
                ret = D(0)
            else:
                ret = (curr_mv - denom) / denom
            
            product *= (1 + ret)
            
            print(f"{d} | {prev_mv:<15.2f} | {flow:<15.2f} | {curr_mv:<15.2f} | {ret*100:6.2f}%")
            
            prev_mv = curr_mv
            
        print("-" * 80)
        print(f"Final Cumulative TTWR (INVESTED): {(product - 1) * 100:.2f}%")
        
        # Now calculate Portfolio-Level TWR (including Cash)
        print("\n--- PORTFOLIO LEVEL TWR (Including Cash) ---")
        from services.metrics_rules import TWR_SIGN_NET_EXTERNAL
        
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
        
        port_rows = []
        for d, tot in pvd_rows:
            port_rows.append((d, _to_d(tot), ext_flow_map.get(d, D(0))))
        
        port_twr = svc._chain_twr(port_rows)
        print(f"Portfolio Level TTWR: {port_twr * 100:.2f}%")
        
        # Cash Breakdown
        print("\n--- CASH & FX ANALYSIS ---")
        start_pvd = svc._get_valuation_at_date(pid, start_date)
        end_pvd = svc._get_valuation_at_date(pid, today)
        
        start_total = _to_d(start_pvd.total_value) if start_pvd else D(0)
        end_total = _to_d(end_pvd.total_value) if end_pvd else D(0)
        start_cash = _to_d(start_pvd.by_cash) if start_pvd else D(0)
        end_cash = _to_d(end_pvd.by_cash) if end_pvd else D(0)
        start_inv = start_total - start_cash
        end_inv = end_total - end_cash
        
        print(f"Start: Total={start_total:.2f}, Cash={start_cash:.2f}, Invested={start_inv:.2f}")
        print(f"End:   Total={end_total:.2f}, Cash={end_cash:.2f}, Invested={end_inv:.2f}")
        
        # Calculate PnL
        from services.metrics_rules import INVESTOR_SIGN
        flow_map_xirr = svc._get_daily_flows(pid, INVESTOR_SIGN, start_date, today)
        total_deposits = sum([float(v) for v in flow_map_xirr.values()])
        
        portfolio_pnl = float(end_total - start_total) - (-total_deposits)
        invested_pnl = float(end_inv - start_inv) - (-total_deposits)  # Assuming all deposits went to invested
        cash_pnl = portfolio_pnl - invested_pnl
        
        print(f"\nTotal Deposits: {-total_deposits:.2f}")
        print(f"Portfolio PnL: {portfolio_pnl:.2f}")
        print(f"Invested PnL (est): {invested_pnl:.2f}")
        print(f"Cash PnL (diff): {cash_pnl:.2f}")
        
        if cash_pnl > 100:
            print("\n⚠️  WARNING: Large Cash PnL detected. This is likely FX gains on cash holdings!")

    finally:
        db.close()

if __name__ == "__main__":
    debug_ttwr()
