import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/stock_scout_dev")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    print("Checking ALL historical sells for Portfolio 4...")
    
    sql = text("""
        SELECT t.id, c.ticker, t.quantity, t.price, t.currency, t.timestamp, t.currency_rate
        FROM transactions t
        LEFT JOIN companies c ON t.company_id = c.company_id
        WHERE t.portfolio_id = 4 
        AND t.transaction_type = 'SELL'
        ORDER BY t.timestamp DESC;
    """)
    
    result = db.execute(sql)
    sells = result.fetchall()
    
    if not sells:
        print("No sells found in history.")
    else:
        print(f"Found {len(sells)} sell transactions.")
        for s in sells:
            print(f"Sell: {s.ticker} | Qty: {s.quantity} | Price: {s.price} {s.currency} | Date: {s.timestamp}")

finally:
    db.close()
