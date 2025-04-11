import logging
from requests import Session
from sqlalchemy.exc import OperationalError
import time
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retry_on_db_lock(func):
    """Improved retry decorator with better session handling"""
    def wrapper(*args, **kwargs):
        max_attempts = 3
        db = None
        
        # Try to find the db session in arguments
        for arg in args:
            if isinstance(arg, Session):
                db = arg
                break
        
        for attempt in range(max_attempts):
            try:
                result = func(*args, **kwargs)
                if db:
                    db.commit()  # Explicit commit
                return result
            except OperationalError as e:
                if db:
                    db.rollback()  # Rollback on error
                if "database is locked" in str(e) and attempt < max_attempts - 1:
                    sleep_time = 2 ** attempt
                    logger.warning(f"Database locked (attempt {attempt+1}/{max_attempts}). Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                else:
                    logger.error("Final database lock attempt failed")
                    raise
            except Exception as e:
                if db:
                    db.rollback()  # Rollback on other errors
                raise
    return wrapper