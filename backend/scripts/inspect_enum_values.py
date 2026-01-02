import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def inspect_enum():
    db = SessionLocal()
    try:
        print("--- Current Enum Values ---")
        result = db.execute(text("SELECT unnest(enum_range(NULL::alerttype))"))
        for row in result:
            print(row[0])

        print("\n--- Current Data Values ---")
        result = db.execute(text("SELECT DISTINCT alert_type FROM alerts"))
        for row in result:
            print(row[0])
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_enum()
