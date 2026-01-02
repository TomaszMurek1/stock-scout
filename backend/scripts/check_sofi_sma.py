import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal
from database.company import Company
from database.stock_data import CompanyMarketData
# Import these to satisfy mapper relationships if they are loaded transitively
from database.account import Account
from database.portfolio import Portfolio
from database.user import User
from database.alert import Alert

def check_sofi():
    db = SessionLocal()
    try:
        print("Checking SOFI data...")
        company = db.query(Company).filter(Company.ticker == 'SOFI').first()
        if not company:
            print("SOFI not found in companies table.")
            return

        md = db.query(CompanyMarketData).filter(CompanyMarketData.company_id == company.company_id).first()
        if not md:
            print("No CompanyMarketData found for SOFI.")
        else:
            print(f"SOFI Market Data:")
            print(f"  Current Price: {md.current_price}")
            print(f"  SMA 50: {md.sma_50}")
            print(f"  SMA 200: {md.sma_200}")
            print(f"  Last Updated: {md.last_updated}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sofi()
