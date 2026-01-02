import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database.base import SessionLocal

def migrate_enum_upper():
    # Get raw engine to avoid session transaction handling
    db = SessionLocal()
    engine = db.get_bind()
    db.close() 
    
    conn = engine.connect()
    try:
        print("Migrating AlertType enum (Adding UPPERCASE)...")
        # Force autocommit isolation level for Enum modification
        conn = conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # We need to add the UPPERCASE versions because SQLAlchemy seems to use Names by default
        # and existing values are UPPERCASE (PRICE_ABOVE etc).
        new_types = [
            'SMA_50_ABOVE_SMA_200',
            'SMA_50_BELOW_SMA_200',
            'SMA_50_APPROACHING_SMA_200'
        ]

        for t in new_types:
            try:
                print(f"Adding value: {t}")
                conn.execute(text(f"ALTER TYPE alerttype ADD VALUE '{t}'"))
                print(f"Added {t}")
            except Exception as e:
                print(f"Could not add {t}: {e}")

        print("Enum migration (Upper) finished.")

    except Exception as e:
        print(f"Fatal Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_enum_upper()
