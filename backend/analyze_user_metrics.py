from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.portfolio import Transaction, TransactionType
from database.stock_data import StockPriceHistory
from database.fx import FxRate

def analyze_ytd():
    """
    Analyze YTD period to explain the user's numbers:
    - Money Made/Lost: -1.22%
    - Pick Quality (TTWR Invested): +23.87%
    - Strategy Quality (TTWR Portfolio): -3.20%
    - Personal Return (MWRR): -5.61%
    """
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        
        # Find which period matches these numbers
        for period in ["ytd", "1y", "6m", "3m"]:
            start_date = svc.get_period_start_date(pid, today, period)
            if not start_date:
                continue
                
            breakdown = svc.calculate_returns_breakdown(pid, start_date, today)
            ttwr_inv = svc.calculate_ttwr_invested_only(pid, start_date, today)
            ttwr_port = svc.calculate_ttwr(pid, start_date, today)
            mwrr = svc.calculate_mwrr(pid, start_date, today)
            
            simple_ret = float(breakdown['invested'].get('simple_return_pct', 0)) * 100
            
            # Check if this matches user's numbers
            if abs(simple_ret - (-1.22)) < 0.1 and abs(float(ttwr_inv) * 100 - 23.87) < 1:
                print(f"✓ FOUND MATCHING PERIOD: {period.upper()}")
                print(f"  Date Range: {start_date} → {today}")
                print(f"  Simple Return: {simple_ret:.2f}%")
                print(f"  TTWR Invested: {float(ttwr_inv) * 100:.2f}%")
                print(f"  TTWR Portfolio: {float(ttwr_port) * 100:.2f}%")
                print(f"  MWRR: {float(mwrr) * 100:.2f}%")
                print()
                
                # Now show the detailed transaction timeline
                print("=" * 80)
                print("TRANSACTION TIMELINE")
                print("=" * 80)
                
                txns = (
                    db.query(Transaction)
                    .filter(
                        Transaction.portfolio_id == pid,
                        Transaction.timestamp >= start_date,
                        Transaction.timestamp <= today
                    )
                    .order_by(Transaction.timestamp.asc())
                    .all()
                )
                
                print(f"\nTotal Transactions: {len(txns)}\n")
                
                for txn in txns:
                    ticker = txn.company.ticker if txn.company else "CASH"
                    qty = float(txn.quantity) if txn.quantity else 0
                    price = float(txn.price) if txn.price else 0
                    fx = float(txn.currency_rate) if txn.currency_rate else 1
                    amount = (qty * price if price != 0 else qty) * fx
                    
                    print(f"{txn.timestamp.date()} | {txn.transaction_type.value:12} | {ticker:6} | "
                          f"Qty: {qty:8.2f} | Price: {price:8.2f} | Amount: {amount:12.2f} PLN")
                
                # Show invested capital timeline
                print("\n" + "=" * 80)
                print("INVESTED CAPITAL TIMELINE (from PVD)")
                print("=" * 80)
                
                from database.valuation import PortfolioValuationDaily
                
                pvd_samples = (
                    db.query(PortfolioValuationDaily)
                    .filter(
                        PortfolioValuationDaily.portfolio_id == pid,
                        PortfolioValuationDaily.date >= start_date,
                        PortfolioValuationDaily.date <= today
                    )
                    .order_by(PortfolioValuationDaily.date.asc())
                    .all()
                )
                
                print(f"\n{'Date':<12} | {'Total Value':>12} | {'Cash':>12} | {'Invested':>12} | {'Daily %':>8}")
                print("-" * 70)
                
                prev_inv = None
                for pvd in pvd_samples[::7]:  # Sample every 7 days
                    inv = float(pvd.total_value - pvd.by_cash)
                    daily_ret = ((inv / prev_inv - 1) * 100) if prev_inv and prev_inv > 0 else 0
                    
                    print(f"{pvd.date} | {float(pvd.total_value):12.2f} | "
                          f"{float(pvd.by_cash):12.2f} | {inv:12.2f} | {daily_ret:7.2f}%")
                    prev_inv = inv
                
                # Show final summary
                print("\n" + "=" * 80)
                print("EXPLANATION")
                print("=" * 80)
                
                beg_inv = float(breakdown['invested']['beginning_value'])
                end_inv = float(breakdown['invested']['ending_value'])
                net_trades = float(breakdown['invested']['net_trades'])
                
                print(f"\nBeginning Invested: {beg_inv:,.2f} PLN")
                print(f"Money Added (Net Purchases): {net_trades:,.2f} PLN")
                print(f"Ending Invested: {end_inv:,.2f} PLN")
                print(f"Capital Gain/Loss: {end_inv - beg_inv - net_trades:,.2f} PLN")
                print()
                print(f"💰 Money Made/Lost = {simple_ret:.2f}%")
                print(f"   Formula: (Ending - Beginning - Purchases) / (Beginning + Purchases)")
                print(f"   = ({end_inv:.0f} - {beg_inv:.0f} - {net_trades:.0f}) / ({beg_inv:.0f} + {net_trades:.0f})")
                print()
                print(f"🎯 Pick Quality (TTWR Invested) = {float(ttwr_inv) * 100:.2f}%")
                print("   This measures stock performance ignoring when you added money")
                print("   Likely: stocks went UP a lot when you had little money,")
                print("          then DOWN slightly when you had lots of money")
                print()
                print(f"📊 Strategy Quality (TTWR Portfolio) = {float(ttwr_port) * 100:.2f}%")
                print("   Portfolio-level return including cash drag")
                print()
                print(f"🏦 Personal Return (MWRR) = {float(mwrr) * 100:.2f}%")
                print("   Your actual IRR - punishes you for adding money before drops")
                
                break

    finally:
        db.close()

if __name__ == "__main__":
    analyze_ytd()
