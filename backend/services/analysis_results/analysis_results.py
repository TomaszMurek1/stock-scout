import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database.analysis import AnalysisResult
from database.company import Company
from database.market import Market
from services.technical_analysis.technical_analysis import find_most_recent_crossover

logger = logging.getLogger(__name__)


def get_or_update_analysis_result(
    db: Session,
    company: Company,
    market: Market,
    cross_type: str,  # "golden" or "death"
    short_window: int,
    long_window: int,
    days_to_look_back: int,
    min_volume: int,
    adjusted: bool,
    stale_after_days: int = 1,
) -> AnalysisResult:
    """
    Retrieve existing AnalysisResult for the specified parameters, if valid.
    Otherwise, re-run find_most_recent_crossover() and update or insert a new record.

    :return: The AnalysisResult row (even if no cross was found -> cross_date=None).
    """
    # 1) Try to find existing record
    existing = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.company_id == company.company_id)
        .filter(AnalysisResult.market_id == market.market_id)
        .filter(AnalysisResult.analysis_type == f"{cross_type}_cross")
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .first()
    )

    # 2) Decide if it is "stale" and needs a refresh
    needs_refresh = False
    if existing:
        # If last_updated is older than X days, re-check
        if existing.last_updated and (
            datetime.utcnow() - existing.last_updated
        ) > timedelta(days=stale_after_days):
            needs_refresh = True

    else:
        needs_refresh = True

    # 3) If we need to refresh, run the analysis function
    if needs_refresh:
        new_data = find_most_recent_crossover(
            ticker=company.ticker,
            market=market.name,
            cross_type=cross_type,
            short_window=short_window,
            long_window=long_window,
            min_volume=min_volume,
            adjusted=adjusted,
            max_days_since_cross=days_to_look_back,
            db=db,
        )
        if not existing:
            # Create a new record if needed
            existing = AnalysisResult(
                company_id=company.company_id,
                market_id=market.market_id,
                analysis_type=f"{cross_type}_cross",
                short_window=short_window,
                long_window=long_window,
            )
            db.add(existing)

        # If new_data is None -> no cross found
        if new_data:
            existing.cross_date = datetime.strptime(new_data["date"], "%Y-%m-%d").date()
            existing.cross_price = new_data["close_price"]
            existing.days_since_cross = new_data["days_since_cross"]
        else:
            existing.cross_date = None
            existing.cross_price = None
            existing.days_since_cross = None

        existing.last_updated = datetime.utcnow()
        db.commit()

    return existing
