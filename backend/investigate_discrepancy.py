
import sys
import os
from datetime import date
from decimal import Decimal
from sqlalchemy import func

# Add project root to path
sys.path.append(os.getcwd())

from database.base import SessionLocal
from database.account import Account # Fix for relationship issue
from database.portfolio import Portfolio, Transaction, TransactionType
from database.valuation import PortfolioValuationDaily

def investigate():
    db = SessionLocal()
    try:
        # 1. Get Portfolio (assuming ID 1 or the first one found)
        pf = db.query(Portfolio).first()
        if not pf:
            print("No portfolio found.")
            return

        print(f"Analyzing Portfolio ID: {pf.id} ({pf.name})")
        
        # 2. Define YTD Period
        today = date(2025, 12, 14) # Using current simulated date
        start_date = date(2025, 1, 1)
        print(f"Period: {start_date} to {today} (YTD)")

        # 3. Fetch Transactions
        txs = db.query(Transaction).filter(
            Transaction.portfolio_id == pf.id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= today
        ).order_by(Transaction.timestamp).all()

        print(f"Total Transactions: {len(txs)}")

        # 4. Aggregates
        deposits = Decimal("0")
        withdrawals = Decimal("0")
        fees = Decimal("0")
        buys = Decimal("0")
        sells = Decimal("0")
        
        for t in txs:
            amt = (t.quantity * (t.price or 1)) + (t.fee or 0)
            if t.transaction_type == TransactionType.DEPOSIT:
                deposits += t.quantity
            elif t.transaction_type == TransactionType.WITHDRAWAL:
                withdrawals += t.quantity
            elif t.transaction_type == TransactionType.FEE: # or t.fee field?
                # Check fee field on all txs or specific FEE type
                pass
            
            # Sum explicit fees from all transactions
            if t.fee:
                 fees += t.fee
            
            # Also check if there are standalone FEE transactions
            if t.transaction_type == TransactionType.FEE:
                 fees += t.quantity

            if t.transaction_type == TransactionType.BUY:
                 buys += (t.quantity * t.price)
            elif t.transaction_type == TransactionType.SELL:
                 sells += (t.quantity * t.price)

        print("-" * 30)
        print(f"Total Deposits: ${deposits:,.2f}")
        print(f"Total Withdrawals: ${withdrawals:,.2f}")
        print(f"Total Fees Paid: ${fees:,.2f}")
        print("-" * 30)
        print(f"Gross Buy Volume: ${buys:,.2f}")
        print(f"Gross Sell Volume: ${sells:,.2f}")
        
        # 5. Check Average Cash Balance (Rough Approx)
        # Getting daily valuations to see cash drag
        daily_vals = db.query(PortfolioValuationDaily).filter(
            PortfolioValuationDaily.portfolio_id == pf.id,
            PortfolioValuationDaily.date >= start_date,
            PortfolioValuationDaily.date <= today
        ).all()
        
        if daily_vals:
            avg_total = sum(d.total_value for d in daily_vals) / len(daily_vals)
            avg_cash = sum(d.by_cash for d in daily_vals) / len(daily_vals)
            avg_invested = sum(d.by_stock + d.by_etf + d.by_crypto for d in daily_vals) / len(daily_vals)
            
            print("-" * 30)
            print(f"Avg Daily Total Value: ${avg_total:,.2f}")
            print(f"Avg Daily Cash Balance: ${avg_cash:,.2f} ({ (avg_cash/avg_total)*100:.1f}% of portfolio)")
            print(f"Avg Daily Invested:    ${avg_invested:,.2f} ({ (avg_invested/avg_total)*100:.1f}% of portfolio)")
        else:
            print("No daily valuation data found.")

    finally:
        db.close()

if __name__ == "__main__":
    investigate()
