from datetime import date
from decimal import Decimal as D
from database.base import SessionLocal
import database.account
import database.portfolio
from services.portfolio_metrics_service import PortfolioMetricsService
from database.portfolio import TransactionType

def debug_breakdown():
    db = SessionLocal()
    try:
        pid = 2
        today = date.today()
        svc = PortfolioMetricsService(db)
        start_date = svc.get_period_start_date(pid, today, "6m")
        
        print(f"DEBUG BREAKDOWN 6M: {start_date} -> {today}\n")
        
        # Get the actual breakdown
        breakdown = svc.calculate_returns_breakdown(pid, start_date, today)
        
        print("=== BREAKDOWN RESULT ===")
        print(f"Beginning Value: {breakdown['beginning_value']}")
        print(f"Ending Value: {breakdown['ending_value']}")
        print(f"\nCash Flows:")
        print(f"  Deposits: {breakdown['cash_flows']['deposits']}")
        print(f"  Withdrawals: {breakdown['cash_flows']['withdrawals']}")
        print(f"  Net External: {breakdown['cash_flows']['net_external']}")
        print(f"\nInvested:")
        print(f"  Beginning: {breakdown['invested']['beginning_value']}")
        print(f"  Ending: {breakdown['invested']['ending_value']}")
        print(f"  Net Trades (Buys - Sells): {breakdown['invested']['net_trades']}")
        print(f"  Capital Gains: {breakdown['invested']['capital_gains']}")
        
        # Now manually check the transaction sums
        print("\n=== MANUAL VERIFICATION ===")
        
        buys = svc._sum_flows(pid, start_date, today, [TransactionType.BUY])
        sells = svc._sum_flows(pid, start_date, today, [TransactionType.SELL])
        deposits = svc._sum_flows(pid, start_date, today, [TransactionType.DEPOSIT])
        
        print(f"BUY transactions sum: {buys}")
        print(f"SELL transactions sum: {sells}")
        print(f"Net Trades (Buys - Sells): {buys - sells}")
        print(f"DEPOSIT transactions sum: {deposits}")
        
        # Check if the amount_sql is computing correctly
        print("\n=== TRANSACTION DETAILS ===")
        from database.portfolio import Transaction
        from services.metrics_rules import amount_sql
        
        buy_txns = (
            db.query(Transaction)
            .filter(
                Transaction.portfolio_id == pid,
                Transaction.timestamp > svc._dt_end_of_day(start_date),
                Transaction.timestamp <= svc._dt_end_of_day(today),
                Transaction.transaction_type == TransactionType.BUY
            )
            .all()
        )
        
        print(f"\nBUY Transactions ({len(buy_txns)} total):")
        for txn in buy_txns:
            qty = float(txn.quantity) if txn.quantity else 0
            price = float(txn.price) if txn.price else 0
            fx = float(txn.currency_rate) if txn.currency_rate else 1
            amount = (qty * price if price != 0 else qty) * fx
            print(f"  {txn.timestamp.date()}: qty={qty}, price={price}, fx={fx}, amount={amount:.2f}")
        
        # Check invested math
        print("\n=== INVESTED PNL CALCULATION ===")
        start_pvd = svc._get_valuation_at_date(pid, start_date)
        end_pvd = svc._get_valuation_at_date(pid, today)
        
        start_inv = D(start_pvd.total_value) - D(start_pvd.by_cash)
        end_inv = D(end_pvd.total_value) - D(end_pvd.by_cash)
        
        print(f"Start Invested (from PVD): {start_inv}")
        print(f"End Invested (from PVD): {end_inv}")
        print(f"Change: {end_inv - start_inv}")
        print(f"Net Trades: {buys - sells}")
        print(f"Invested PnL = Change - Net Trades = {(end_inv - start_inv) - (buys - sells)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_breakdown()
