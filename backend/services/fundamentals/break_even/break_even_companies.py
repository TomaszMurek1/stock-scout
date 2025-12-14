from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session
from database.company import Company
from database.financials import CompanyFinancialHistory
from database.market import Market


def find_companies_near_break_even(
    db: Session,
    months: int,
    company_ids: List[int],
    threshold_pct: float = 5.0,
    min_market_cap: float | None = None,
) -> Tuple[List[dict], Dict[int, bool]]:
    """
    Finds companies whose most recent net income is within ±X% of revenue
    AND has improved compared to a report ~1 year earlier.
    """
    if not company_ids:
        return [], {}

    now = datetime.now(timezone.utc)
    recent_cutoff = datetime(now.year, now.month, 1, tzinfo=timezone.utc) - relativedelta(months=months)
    lookback_window = timedelta(days=150)  # ~5 months window to match ~1 year earlier

    query = (
        db.query(CompanyFinancialHistory, Company, Market.currency)
        .join(Company, CompanyFinancialHistory.company_id == Company.company_id)
        .outerjoin(Market, Market.market_id == Company.market_id)
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))
        .filter(CompanyFinancialHistory.net_income.isnot(None))
        .filter(CompanyFinancialHistory.total_revenue.isnot(None))
    )

    if min_market_cap is not None and min_market_cap > 0:
        # Import here to avoid circular dependencies if placed at top level (sometimes happens)
        from database.stock_data import CompanyMarketData
        val_to_check = min_market_cap * 1_000_000
        print(f"DEBUG: Filtering with market_cap >= {val_to_check}")
        query = (
            query
            .join(CompanyMarketData, CompanyMarketData.company_id == Company.company_id)
            .filter(CompanyMarketData.market_cap >= val_to_check)  # User passes millions
        )

    financial_data = (
        query
        .order_by(CompanyFinancialHistory.company_id, CompanyFinancialHistory.report_end_date)
        .all()
    )

    from collections import defaultdict

    company_history = defaultdict(list)
    for record, company, currency in financial_data:
        company_history[company.company_id].append((record, company, currency))

    results: List[dict] = []
    processed: Dict[int, bool] = {cid: False for cid in company_ids}

    for cid, entries in company_history.items():
        # if cid != 1:  # Only debug SOFI
        #     continue

        # Get the latest report within the recent window
        latest = None
        for rec, comp, curr in reversed(entries):
            rec_date = rec.report_end_date.replace(tzinfo=timezone.utc) if rec.report_end_date.tzinfo is None else rec.report_end_date
            
            if rec_date >= recent_cutoff:
                latest = (rec, comp, curr)
                break

        if not latest:
            processed[cid] = False
            continue

        latest_rec, company, currency = latest
        latest_date = latest_rec.report_end_date
        latest_net = latest_rec.net_income
        latest_rev = latest_rec.total_revenue

        def make_aware(dt):
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

        target_date = make_aware(latest_date - timedelta(days=365))
      
        for e in entries:
            qd = make_aware(e[0].report_end_date)
            delta_days = abs((qd - target_date).days)

        closest = min(
            (
                e for e in entries
                if abs((make_aware(e[0].report_end_date) - target_date).days) <= lookback_window.days
            ),
            key=lambda x: abs((make_aware(x[0].report_end_date) - target_date).days),
            default=None
        )

        if not closest:
            continue

        prev_rec = closest[0]
        prev_net = prev_rec.net_income

        improving = latest_net >= prev_net * 1.1  # take from param in future
        threshold_val = abs(latest_rev) * (threshold_pct / 100.0)
        within_threshold = latest_net >= -threshold_val

        previous_was_low = prev_net <= threshold_val  # allows small profit or loss
        qualifies = improving and within_threshold and previous_was_low
        processed[cid] = qualifies
        if qualifies:
            results.append(
                {
                    "company_id": company.company_id,
                    "ticker": company.ticker,
                    "company_name": company.name,
                    "current_quarter": latest_rec.report_end_date.isoformat(),
                    "previous_quarter": prev_rec.report_end_date.isoformat(),
                    "previous_net_income": prev_net,
                    "current_net_income": latest_net,
                    "total_revenue": latest_rev,
                    "currency": currency,
                    "threshold_margin": round(threshold_val, 2),
                }
            )
    return results, processed
