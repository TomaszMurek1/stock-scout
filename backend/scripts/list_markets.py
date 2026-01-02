import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def list_markets():
    db = SessionLocal()
    try:
        print("Markets in DB:")
        result = db.execute(text("SELECT * FROM markets"))
        for row in result:
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_markets()
