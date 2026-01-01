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
        .filter(CompanyFinancialHistory.period_type.in_(['quarterly', 'annual']))  # Need both for Hybrid comparison
        .filter(CompanyFinancialHistory.net_income.isnot(None))
        .filter(CompanyFinancialHistory.total_revenue.isnot(None))
    )

    if min_market_cap is not None and min_market_cap > 0:
        # Import here to avoid circular dependencies if placed at top level (sometimes happens)
        from database.stock_data import CompanyMarketData
        val_to_check = min_market_cap * 1_000_000
        # print(f"DEBUG: Filtering with market_cap >= {val_to_check}")
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
        # Separate Quarterly vs Annual
        # entries are sorted by date ASC (Oldest -> Newest)
        
        quarterly_recs = []
        annual_recs = []
        
        company = entries[0][1] # Get company obj from first entry
        currency = entries[0][2]

        for r, _, _ in entries:
            if r.period_type == 'quarterly':
                quarterly_recs.append(r)
            elif r.period_type == 'annual':
                annual_recs.append(r)
        
        # Sort desc (Newest -> Oldest)
        quarterly_recs.sort(key=lambda x: x.report_end_date, reverse=True)
        annual_recs.sort(key=lambda x: x.report_end_date, reverse=True)

        # Requirement 1: Need at least 4 quarters to form a "Current TTM"
        if len(quarterly_recs) < 4:
            processed[cid] = False
            continue
            
        # Requirement 2: Need at least 1 Annual report to compare against
        if len(annual_recs) < 1:
            processed[cid] = False
            continue

        # Current TTM (Most recent 4 quarters)
        # Note: We assume these are the LAST 4 quarters. Even if there are gaps, we take the last 4 available.
        current_q_slice = quarterly_recs[0:4]
        
        current_ttm_net = sum(q.net_income for q in current_q_slice if q.net_income is not None)
        current_ttm_rev = sum(q.total_revenue for q in current_q_slice if q.total_revenue is not None)

        # Previous Benchmark: The Last Full Annual Report
        last_annual = annual_recs[0]
        prev_annual_net = last_annual.net_income

        # --- HYBRID COMPARISON LOGIC ---
        # 1. Was Structurally Unprofitable: The Last Full Year was a Net Loss
        was_unprofitable = prev_annual_net < 0

        # 2. Improving Trend: Current TTM Net Income is BETTER than Last Full Year
        is_improving = current_ttm_net > prev_annual_net

        # 3. Near Break-Even Zone: TTM Net Margin check
        if current_ttm_rev == 0:
            processed[cid] = False
            continue
            
        current_ttm_margin_pct = (current_ttm_net / abs(current_ttm_rev)) * 100.0
        
        # Check if margin is within [-threshold, +threshold]
        is_near_break_even = -threshold_pct <= current_ttm_margin_pct <= threshold_pct

        qualifies = was_unprofitable and is_improving and is_near_break_even
        # --- END NEW LOGIC ---

        processed[cid] = qualifies
        if qualifies:
            latest_rec_date = current_q_slice[0].report_end_date
            prev_rec_date = last_annual.report_end_date

            results.append(
                {
                    "company_id": company.company_id,
                    "ticker": company.ticker,
                    "company_name": company.name,
                    "current_quarter": latest_rec_date.isoformat(), # Keeping key name for frontend
                    "previous_quarter": prev_rec_date.isoformat(),  # This is now the annual report date
                    "previous_net_income": prev_annual_net, 
                    "current_net_income": current_ttm_net,
                    "total_revenue": current_ttm_rev,
                    "currency": currency,
                    "threshold_margin": round(current_ttm_margin_pct, 2),
                }
            )
    return results, processed
