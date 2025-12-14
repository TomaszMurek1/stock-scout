
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal
from services.portfolio_metrics_service import PortfolioMetricsService
from services.portfolio_positions_service import ensure_portfolio_prices_fresh
from database.portfolio import Portfolio
from database.account import Account
from database.company import Company
from database.position import PortfolioPositions

def debug():
    db = SessionLocal()
    try:
        # Get portfolio 1 (assuming user's portfolio)
        port = db.query(Portfolio).first()
        if not port:
            print("No portfolio found")
            return
            
        print(f"Portfolio: {port.name} (ID: {port.id})")
        
        svc = PortfolioMetricsService(db)
        
        end_date = date.today()
        # 1W period
        period = "1w"
        start_date = svc.get_period_start_date(port.id, end_date, period)
        
        print(f"Period: {period}")
        print(f"Start Date: {start_date}")
        print(f"End Date: {end_date}")
        
        # Check valuations
        start_val = svc._valuation_as_of(port.id, start_date)
        end_val = svc._valuation_as_of(port.id, end_date)
        
        print(f"Start Value (as of {start_date}): {start_val}")
        print(f"End Value (as of {end_date}): {end_val}")
        
        # Check flows using breakdown logic
        bd = svc.calculate_returns_breakdown(port.id, start_date, end_date)
        
        print("\n--- Breakdown Result ---")
        print(f"Beginning Value: {bd.get('beginning_value')}")
        print(f"Ending Value: {bd.get('ending_value')}")
        print(f"Net External: {bd['cash_flows']['net_external']}")
        print(f"Total PnL (ex flows): {bd['pnl']['total_pnl_ex_flows']}")
        
        # Manual check
        s = bd.get('beginning_value')
        e = bd.get('ending_value')
        flows = bd['cash_flows']['net_external']
        
        if s and e:
            calc_diff = (e - s)
            calc_pnl = calc_diff - flows
            print(f"\nManual Check:")
            print(f"End - Start = {calc_diff}")
            print(f"(End - Start) - NetExternal = {calc_pnl}")
            
    finally:
        db.close()

if __name__ == "__main__":
    debug()
