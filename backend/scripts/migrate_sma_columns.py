import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def migrate():
    db = SessionLocal()
    try:
        print("Migrating SMA columns...")
        
        # Postgres syntax
        sql_50 = text("ALTER TABLE company_market_data RENAME COLUMN fifty_day_average TO sma_50;")
        sql_200 = text("ALTER TABLE company_market_data RENAME COLUMN two_hundred_day_average TO sma_200;")
        
        try:
            db.execute(sql_50)
            print("Renamed fifty_day_average -> sma_50")
        except Exception as e:
            print(f"Error renaming 50: {e}")

        try:
            db.execute(sql_200)
            print("Renamed two_hundred_day_average -> sma_200")
        except Exception as e:
            print(f"Error renaming 200: {e}")
            
        db.commit()
        print("Migration complete.")

    except Exception as e:
        print(f"Fatal Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
