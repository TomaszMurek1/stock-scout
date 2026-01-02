import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def migrate_enum():
    # Get raw engine to avoid session transaction handling
    db = SessionLocal()
    engine = db.get_bind()
    db.close() # Close session, we use engine directly
    
    conn = engine.connect()
    try:
        print("Migrating AlertType enum...")
        # Force autocommit isolation level for Enum modification
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        new_types = [
            'sma_50_above_sma_200',
            'sma_50_below_sma_200',
            'sma_50_approaching_sma_200'
        ]

        for t in new_types:
            try:
                print(f"Adding value: {t}")
                conn.execute(text(f"ALTER TYPE alerttype ADD VALUE '{t}'"))
                print(f"Added {t}")
            except Exception as e:
                # Value likely exists
                print(f"Could not add {t} (likely already exists): {e}")

        print("Enum migration finished.")

    except Exception as e:
        print(f"Fatal Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_enum()
