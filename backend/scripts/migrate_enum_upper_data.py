import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def migrate_data():
    db = SessionLocal()
    try:
        print("Migrating alert types to UPPERCASE...")
        # Since the enum contains both lower and upper for SMAs, and UPPER for PRICE,
        # we can just try to update. Postgres might complain if we try to set a value not in the enum.
        # But we verified all UPPERCASE variants exist in the enum.
        
        # We cast to text and back to ensure it doesn't complain about enum mapping during the update if needed,
        # but pure SQL update on enum column usually works if target value exists.
        
        # However, to be safe against "value not in enum" if we had missing ones,
        # we rely on the fact that my previous inspection showed the Uppercase ones EXIST.
        
        stmt = text("UPDATE alerts SET alert_type = upper(alert_type::text)::alerttype")
        result = db.execute(stmt)
        db.commit()
        print(f"Migration completed. Rows affected: {result.rowcount}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data()
