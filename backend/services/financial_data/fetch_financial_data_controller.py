from datetime import timezone, timedelta, datetime
from sqlalchemy.orm import Session
from database.models import CompanyFinancials, CompanyMarketData


def is_data_fresh(last_updated, max_age_hours):
    if not last_updated:
        return False
    if last_updated.tzinfo is None:
        last_updated = last_updated.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - last_updated < timedelta(hours=max_age_hours)


def should_fetch_financial_data(company_id: int, market_id: int, db: Session, max_age_hours=24) -> bool:
    fin = db.query(CompanyFinancials).filter_by(company_id=company_id, market_id=market_id).first()
    market = db.query(CompanyMarketData).filter_by(company_id=company_id, market_id=market_id).first()
    return not (fin and market and is_data_fresh(fin.last_updated, max_age_hours) and is_data_fresh(market.last_updated, max_age_hours))
