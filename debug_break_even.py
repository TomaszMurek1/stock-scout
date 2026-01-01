
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func
from backend.database.financials import CompanyFinancialHistory
from backend.database.company import Company
from backend.database.market import Market

# Adjust connection string if needed (assuming defaults)
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/stock_scout"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def inspect_data():
    print("--- Inspecting Detailed Financial Data ---")
    
    # Check total quarterly records
    total_q = db.query(CompanyFinancialHistory).filter(CompanyFinancialHistory.period_type == 'quarterly').count()
    print(f"Total Quarterly Records: {total_q}")

    # Check companies with at least 1 quarterly record
    companies_with_data = (
        db.query(CompanyFinancialHistory.company_id, func.count(CompanyFinancialHistory.id))
        .filter(CompanyFinancialHistory.period_type == 'quarterly')
        .group_by(CompanyFinancialHistory.company_id)
        .all()
    )
    
    print(f"Companies with ANY quarterly data: {len(companies_with_data)}")
    
    # Check companies with >= 8 quarterly records (Requirement for TTM)
    companies_with_8_plus = [c for c in companies_with_data if c[1] >= 8]
    print(f"Companies with >= 8 quarterly records: {len(companies_with_8_plus)}")
    
    if len(companies_with_8_plus) < 10:
        print("\nLow data count! detailed list of companies with data:")
        for cid, count in companies_with_data:
             comp = db.query(Company).filter(Company.company_id == cid).first()
             print(f"ID: {cid} | Ticker: {comp.ticker} | Records: {count}")

if __name__ == "__main__":
    inspect_data()
