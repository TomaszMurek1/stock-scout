from sqlalchemy.orm import Session
from sqlalchemy.exc import  IntegrityError
from database.market import Market
import logging
from sqlalchemy.exc import IntegrityError


from services.utils.db_retry import retry_on_db_lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_or_create_market(market_name: str, db: Session) -> Market:
    """Fetch a market by name, or create if not found."""
    market_obj = db.query(Market).filter_by(name=market_name).first()
    if market_obj:
        return market_obj
    logger.info(f"Market {market_name} not found; creating new Market entry.")
    market_obj = Market(name=market_name, country='Unknown', currency='Unknown', timezone='Unknown')
    db.add(market_obj)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.error(f"Integrity error creating market {market_name}: {exc}")
        return None
    return market_obj


