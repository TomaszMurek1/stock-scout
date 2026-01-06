import sys
import os
from sqlalchemy import create_engine, text
from decimal import Decimal

# Add backend to path to import models if needed, but raw SQL is safer/faster for debug
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# DB Connection
DATABASE_URL = "postgresql://stockscout_user:newpassword@localhost:5432/stock_scout_db"
engine = create_engine(DATABASE_URL)

PORTFOLIO_ID = 4

sql = text("""
    SELECT *
    FROM transactions 
    WHERE portfolio_id = :pid 
    AND transaction_type = 'DEPOSIT'
    ORDER BY timestamp DESC
""")

with engine.connect() as conn:
    print(f"--- DEPOSITS for Portfolio {PORTFOLIO_ID} (Ordered by Date) ---")
    result = conn.execute(sql, {"pid": PORTFOLIO_ID}).fetchall()
    
    total_deposits = Decimal("0")
    for row in result:
        # row[7] is timestamp, row[5] is quantity
        print(f"Date: {row[7]} | Amount: {row[5]}")
        total_deposits += Decimal(str(row[5]))
        
    print(f"Total from DB: {total_deposits}")

    # Check specifically for 300
    sql_300 = text("SELECT * FROM transactions WHERE portfolio_id = :pid AND quantity = 300")
    res_300 = conn.execute(sql_300, {"pid": PORTFOLIO_ID}).fetchall()
    print(f"\n--- Transactions with Amount 300 ---")
    for r in res_300:
        print(r)

