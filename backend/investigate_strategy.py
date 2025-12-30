from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.valuation import PortfolioValuationDaily

def investigate_strategy_quality():
    """
    Why is Strategy Quality -3.2% when Pick Quality is +23.87%?
    Cash in PLN shouldn't have FX losses.
    """
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        
        start_date = svc.get_period_start_date(pid, today, "ytd")
        
        # Get start and end valuations
        start_pvd = svc._get_valuation_at_date(pid, start_date)
        end_pvd = svc._get_valuation_at_date(pid, today)
        
        print("=== YTD PORTFOLIO BREAKDOWN ===\n")
        print(f"Start Date: {start_pvd.date}")
        print(f"  Total Value: {float(start_pvd.total_value):,.2f} PLN")
        print(f"  Cash: {float(start_pvd.by_cash):,.2f} PLN")
        print(f"  Invested: {float(start_pvd.total_value - start_pvd.by_cash):,.2f} PLN")
        print()
        
        print(f"End Date: {end_pvd.date}")
        print(f"  Total Value: {float(end_pvd.total_value):,.2f} PLN")
        print(f"  Cash: {float(end_pvd.by_cash):,.2f} PLN")
        print(f"  Invested: {float(end_pvd.total_value - end_pvd.by_cash):,.2f} PLN")
        print()
        
        # Calculate Portfolio TTWR manually
        print("=== MANUAL PORTFOLIO TTWR CALCULATION ===\n")
        
        # What was the actual TTWR?
        ttwr_port = svc.calculate_ttwr(pid, start_date, today)
        ttwr_inv = svc.calculate_ttwr_invested_only(pid, start_date, today)
        
        print(f"TTWR Portfolio (actual): {float(ttwr_port) * 100:.2f}%")
        print(f"TTWR Invested (actual): {float(ttwr_inv) * 100:.2f}%")
        print()
        
        # Let's check the cash percentage over time
        pvds = (
            db.query(PortfolioValuationDaily)
            .filter(
                PortfolioValuationDaily.portfolio_id == pid,
                PortfolioValuationDaily.date >= start_date,
                PortfolioValuationDaily.date <= today
            )
            .order_by(PortfolioValuationDaily.date.asc())
            .all()
        )
        
        print("=== CASH % OVER TIME ===\n")
        print(f"{'Date':<12} | {'Total':>12} | {'Cash':>12} | {'Cash %':>8}")
        print("-" * 50)
        
        for pvd in pvds[::30]:  # Sample every 30 days
            total = float(pvd.total_value)
            cash = float(pvd.by_cash)
            cash_pct = (cash / total * 100) if total > 0 else 0
            print(f"{pvd.date} | {total:12,.0f} | {cash:12,.0f} | {cash_pct:7.1f}%")
        
        # Final calculation
        total_start = float(start_pvd.total_value)
        total_end = float(end_pvd.total_value)
        cash_start = float(start_pvd.by_cash)
        cash_end = float(end_pvd.by_cash)
        inv_start = total_start - cash_start
        inv_end = total_end - cash_end
        
        print("\n=== WHY THE DIFFERENCE? ===\n")
        print(f"Invested grew: {inv_start:,.0f} → {inv_end:,.0f}")
        print(f"  (ignoring deposits, TTWR = +23.87%)")
        print()
        print(f"But Total Portfolio: {total_start:,.0f} → {total_end:,.0f}")
        print(f"  (with massive cash balance earning 0%)")
        print()
        print("The issue: You kept 70-75% in CASH for most of the year!")
        print("Even though stocks did +23.87%, cash earning 0% dragged it way down")
        print()
        print("Weighted calculation:")
        avg_cash_pct = sum([float(p.by_cash) / float(p.total_value) for p in pvds]) / len(pvds) * 100
        print(f"  Average cash %: {avg_cash_pct:.1f}%")
        print(f"  Expected portfolio return: {23.87 * (1 - avg_cash_pct/100):.2f}%")
        print(f"  Actual portfolio return: {float(ttwr_port) * 100:.2f}%")
        
    finally:
        db.close()

if __name__ == "__main__":
    investigate_strategy_quality()
