import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def inspect_enum():
    db = SessionLocal()
    try:
        print("Inspecting AlertType enum values...")
        # Query pg_enum to see actual values
        sql = text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'alerttype'")
        result = db.execute(sql)
        for row in result:
            print(f"Enum Value: {row[0]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_enum()
