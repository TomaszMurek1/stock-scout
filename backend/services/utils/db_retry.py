import logging
from sqlalchemy.exc import OperationalError
import time
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def retry_on_db_lock(func):
    """Simple retry decorator in case the DB is locked."""
    def wrapper(*args, **kwargs):
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_attempts - 1:
                    logger.warning(f"Database locked. Retrying in {2**attempt} seconds...")
                    time.sleep(2**attempt)
                else:
                    raise
    return wrapper