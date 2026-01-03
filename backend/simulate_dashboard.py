
import os
import sys
import json
from datetime import date
from sqlalchemy.orm import Session

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.base import SessionLocal
from database import *
from database.user import User
from database.alert import Alert
from database.account import Account
from database.portfolio import Portfolio
from services.portfolio_positions_service import get_holdings_for_user
from services.portfolio_metrics_service import PortfolioMetricsService
from services.portfolio_snapshot_service import get_portfolio_snapshot
from services.portfolio_valuation_service import get_latest_portfolio_valuation
from utils.portfolio_utils import parse_as_of_date

def serialize(obj):
    from decimal import Decimal
    if isinstance(obj, Decimal): return float(obj)
    if hasattr(obj, 'isoformat'): return obj.isoformat()
    if isinstance(obj, dict): return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list): return [serialize(v) for v in obj]
    return str(obj)

def simulate_dashboard():
    db = SessionLocal()
    try:
        portfolio = db.query(Portfolio).filter(Portfolio.id == 4).first()
        if not portfolio:
            print("Portfolio 4 not found")
            return

        end_date = date(2026, 1, 3)
        svc = PortfolioMetricsService(db)

        performance = svc.build_performance_summary(
            portfolio.id,
            end_date,
            include_all_breakdowns=True,
        )

        holdings = get_holdings_for_user(db, portfolio)
        
        ytd_bd = performance.get("breakdowns", {}).get("ytd", {}).get("invested", {})
        print("--- YTD INVESTED BREAKDOWN ---")
        print(json.dumps(serialize(ytd_bd), indent=2))
        
        print("\n--- ASML HOLDING ---")
        asml = next((h for h in holdings if "ASML" in h["ticker"]), None)
        print(json.dumps(serialize(asml), indent=2))
        
        print("\n--- PERFORMANCE SUMMARY ---")
        print(json.dumps(serialize(performance["performance"]), indent=2))

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    simulate_dashboard()
