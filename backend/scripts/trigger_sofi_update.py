import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal
from services.yfinance_data_update.data_update_service import ensure_fresh_data
# Import models to satisfy registry
from database.company import Company
from database.stock_data import CompanyMarketData
from database.account import Account
from database.portfolio import Portfolio
from database.user import User
from database.alert import Alert

def trigger_update():
    db = SessionLocal()
    try:
        print("Triggering update for SOFI...")
        # use_batch_for_price_history_data = 0 (false) to test the single path
        ensure_fresh_data("SOFI", "NASDAQ Stock Market", 0, db)
        print("Update function returned.")
        
        # Verify
        company = db.query(Company).filter(Company.ticker == 'SOFI').first()
        md = db.query(CompanyMarketData).filter(CompanyMarketData.company_id == company.company_id).first()
        if md:
            print(f"SOFI Market Data after update:")
            print(f"  SMA 50: {md.sma_50}")
            print(f"  SMA 200: {md.sma_200}")
        else:
            print("No market data found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    trigger_update()
