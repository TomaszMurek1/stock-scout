
import os
import sys
from datetime import date
from sqlalchemy import create_engine

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# CRITICAL: Import strict order to avoid SQLAlchemy "Alert" error
from database.base import Base, engine, SessionLocal
from database import *
from database.user import User
from database.alert import Alert  # Must be imported for User relationship
from database.portfolio import Portfolio, Transaction
from database.account import Account
from database.company import Company
from services.valuation.rematerializ import rematerialize_from_tx

def run_fix():
    print("Starting history fix...")
    db = SessionLocal()
    try:
        # Portfolio 4
        # Start far back enough to cover all recent history. 
        # User mentioned 2025 data, so let's start Jan 1, 2025 to be safe.
        start_date = date(2025, 1, 1)
        portfolio_id = 4
        
        print(f"Rematerializing Portfolio {portfolio_id} from {start_date}...")
        rematerialize_from_tx(db, portfolio_id, tx_day=start_date)
        print("Rematerialization complete.")
        
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_fix()
