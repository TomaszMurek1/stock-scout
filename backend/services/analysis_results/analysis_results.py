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
    cross_type: str,
    short_window: int,
    long_window: int,
    days_to_look_back: int,
    min_volume: int,
    adjusted: bool,
    stale_after_days: int = 1,
) -> AnalysisResult:
    """
    Efficiently fetches or refreshes AnalysisResult, avoiding recomputation when not needed.
    """
    existing = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.company_id == company.company_id)
        .filter(AnalysisResult.market_id == market.market_id)
        .filter(AnalysisResult.analysis_type == f"{cross_type}_cross")
        .filter(AnalysisResult.short_window == short_window)
        .filter(AnalysisResult.long_window == long_window)
        .first()
    )

    now = datetime.utcnow().date()

    if existing:
        cross_date = existing.cross_date
        last_updated = existing.last_updated.date() if existing.last_updated else None

        if cross_date:
            # ✅ Cross exists and is recent enough
            if (now - cross_date).days <= 30:
                return existing
            # 🔄 Cross is too old → refresh
        else:
            if last_updated == now:
                # ✅ No cross but already checked today
                return existing
            # 🔄 No cross and stale → refresh

    # 🔄 No record, or outdated → recompute
    print(f"Refreshing analysis for {company.ticker} in {market.name}...")

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
        existing = AnalysisResult(
            company_id=company.company_id,
            market_id=market.market_id,
            analysis_type=f"{cross_type}_cross",
            short_window=short_window,
            long_window=long_window,
        )
        db.add(existing)

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
