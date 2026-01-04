import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database.base import get_db
from datetime import datetime

from database.market import Market
from database.company import Company
from database.analysis import AnalysisResult
from database.financials import CompanyFinancials
from schemas.fundamentals_schemas import BreakEvenPointRequest, EVRevenueScanRequest
from services.fundamentals.break_even.break_even_companies import (
    find_companies_near_break_even,
)
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)
from services.yfinance_data_update.data_update_service import (
    ensure_fresh_data,
    fetch_and_save_stock_price_history_data_batch,
)
from services.basket_resolver import resolve_baskets_to_companies
from services.scan_job_service import create_job, run_scan_task

router = APIRouter()
logger = logging.getLogger(__name__)


def run_ev_revenue_scan(db: Session, request: EVRevenueScanRequest):
    """
    Core logic for EV/Revenue scan, intended to run in the background.
    """
    # 1) Resolve baskets to companies
    try:
        market_ids, companies = resolve_baskets_to_companies(db, request.basket_ids)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not companies:
        return {"status": "success", "data": [], "message": "No companies found in selected baskets."}

    logger.info(f"Scanning {len(companies)} companies from baskets: {request.basket_ids}")

    # 2) Group companies by market for batch operations
    from collections import defaultdict
    companies_by_market: dict[int, list] = defaultdict(list)
    for comp in companies:
        if comp.market_id:
            companies_by_market[comp.market_id].append(comp)

    # 3) Batch fetch price history for each market
    markets = db.query(Market).filter(Market.market_id.in_(market_ids)).all()
    for market in markets:
        market_companies = companies_by_market.get(market.market_id, [])
        if not market_companies:
            continue

        tickers = [company.ticker for company in market_companies]

        fetch_and_save_stock_price_history_data_batch(
            tickers=tickers,
            market_name=market.name,
            db=db,
            start_date=None,
            end_date=None,
            force_update=False,
        )
        db.commit()

    # 4) Fetch/update financial data if necessary
    # Optimization: we could batch this or only do it if stale.
    # Currently it's doing it one-by-one which is slow.
    for c in companies:
        if c.market and c.market.market_id in market_ids:
            update_financials_for_tickers(
                db=db,
                tickers=[c.ticker],
                market_name=c.market.name,
            )

    # 5) Query `CompanyFinancials` table
    q = (
        db.query(CompanyFinancials)
        .join(Company)
        .filter(CompanyFinancials.market_id.in_(market_ids))
        .filter(CompanyFinancials.enterprise_value.isnot(None))
        .filter(CompanyFinancials.total_revenue.isnot(None))
        .filter(CompanyFinancials.total_revenue != 0)
    )

    # Calculate EV-to-Revenue dynamically
    if request.min_ev_to_revenue is not None:
        q = q.filter(
            (CompanyFinancials.enterprise_value / CompanyFinancials.total_revenue)
            >= request.min_ev_to_revenue
        )
    if request.max_ev_to_revenue is not None:
        q = q.filter(
            (CompanyFinancials.enterprise_value / CompanyFinancials.total_revenue)
            <= request.max_ev_to_revenue
        )

    matches = q.all()
    
    # 6) Format response
    results = []
    for item in matches:
        ev_to_revenue = (
            item.enterprise_value / item.total_revenue
            if item.enterprise_value is not None and item.total_revenue not in (None, 0)
            else "N/A"
        )
        results.append(
            {
                "ticker": item.company.ticker,
                "company_name": item.company.name,
                "market": item.market.name,
                "ev_to_revenue": ev_to_revenue,
                "enterprise_value": (
                    item.enterprise_value
                    if item.enterprise_value is not None
                    else "N/A"
                ),
                "total_revenue": (
                    item.total_revenue if item.total_revenue is not None else "N/A"
                ),
                "last_updated": (
                    item.last_updated.isoformat() if item.last_updated else None
                ),
            }
        )

    return {"status": "success", "data": results}


@router.post("/ev-to-revenue")
def ev_revenue_scan(
    request: EVRevenueScanRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Initiate an asynchronous EV/Revenue scan.
    """
    if not request.basket_ids:
        raise HTTPException(status_code=400, detail="No baskets specified.")

    job = create_job(db, "ev_to_revenue")

    def task_wrapper(db_session: Session):
        return run_ev_revenue_scan(db_session, request)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    
    return {"job_id": job.id, "status": "PENDING"}


@router.post("/break-even-companies")
def get_break_even_companies(
    request: BreakEvenPointRequest, db: Session = Depends(get_db)
):
    # Possibly refresh for ALL companies (or only certain ones).
    # Then analyze CompanyFinancialHistory table to find break-even crossing.

    if not request.markets and not request.basket_ids:
        raise HTTPException(status_code=400, detail="Select at least one market or basket.")

    months = 12  # TODO: adjust month later to be taken from api call
    threshold_pct = request.threshold_pct or 5.0
    threshold_key = int(round(threshold_pct * 100))

    market_ids = set()
    company_map = {}

    if request.markets:
        markets = db.query(Market).filter(Market.name.in_(request.markets)).all()
        if not markets:
            raise HTTPException(status_code=404, detail="No matching markets found in DB.")
        ids = [m.market_id for m in markets]
        market_ids.update(ids)
        companies = db.query(Company).filter(Company.market_id.in_(ids)).all()
        for comp in companies:
            company_map[comp.company_id] = comp

    if request.basket_ids:
        try:
            basket_market_ids, basket_companies = resolve_baskets_to_companies(db, request.basket_ids)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        market_ids.update(basket_market_ids)
        for comp in basket_companies:
            company_map[comp.company_id] = comp

    if not company_map:
        logger.info("Break-even scan: no companies resolved for request %s", request.model_dump())
        return {"status": "success", "data": []}

    companies = list(company_map.values())
    if not market_ids:
        for comp in companies:
            if comp.market_id:
                market_ids.add(comp.market_id)

    company_ids = [comp.company_id for comp in companies]

    logger.info("Break-even scan analyzing %d companies", len(companies))

    from collections import defaultdict

    tickers_by_market: dict[str, list[str]] = defaultdict(list)
    manual_refresh = []

    val_to_check = (request.min_market_cap or 0) * 1_000_000
    for comp in companies:
        if val_to_check > 0:
            md = comp.market_data[0] if comp.market_data else None
            if md and md.market_cap is not None and md.market_cap < val_to_check:
                continue

        if comp.market and comp.market.name:
            tickers_by_market[comp.market.name].append(comp.ticker)
        else:
            manual_refresh.append(comp)

    for market_name, tickers in tickers_by_market.items():
        try:
            logger.info(f"Updating financials for market: {market_name} (tickers: {len(tickers)})")
            update_financials_for_tickers(
                db=db,
                tickers=tickers,
                market_name=market_name,
                include_quarterly=True
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Batch financial refresh failed for %s: %s", market_name, exc)

    for comp in manual_refresh:
        market_name = comp.market.name if comp.market else "Unknown"
        try:
            ensure_fresh_data(comp.ticker, market_name, True, db)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Skipping %s during refresh: %s", comp.ticker, exc)

    today = datetime.utcnow().date()
    existing_rows = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.analysis_type == "break_even")
        .filter(AnalysisResult.short_window == threshold_key)
        .filter(AnalysisResult.company_id.in_(company_ids))
        .all()
    )
    analysis_map = {row.company_id: row for row in existing_rows}

    fresh_positive_ids = []
    stale_company_ids = []
    for comp in companies:
        row = analysis_map.get(comp.company_id)
        if row and row.last_updated and row.last_updated.date() == today:
            if row.days_since_cross == 1:
                fresh_positive_ids.append(comp.company_id)
            continue
        stale_company_ids.append(comp.company_id)

    combined_results = []

    if stale_company_ids:
        new_results, status_map = find_companies_near_break_even(
            db, months, stale_company_ids, threshold_pct=threshold_pct, min_market_cap=request.min_market_cap
        )
        new_result_map = {item["company_id"]: item for item in new_results}
        for cid in stale_company_ids:
            comp = company_map.get(cid)
            if not comp:
                continue
            market_id = comp.market_id or (comp.market.market_id if comp.market else None)
            if market_id is None:
                continue
            row = analysis_map.get(cid)
            if not row:
                row = AnalysisResult(
                    company_id=comp.company_id,
                    market_id=market_id,
                    analysis_type="break_even",
                )
                db.add(row)
                analysis_map[cid] = row
            else:
                row.market_id = market_id
                row.analysis_type = "break_even"

            row.cross_date = None
            row.cross_price = None
            row.days_since_cross = 0
            row.short_window = threshold_key

            payload = new_result_map.get(cid)
            if status_map.get(cid) and payload:
                try:
                    row.cross_date = datetime.fromisoformat(payload["current_quarter"]).date()
                except Exception:
                    row.cross_date = None
                row.cross_price = payload.get("current_net_income")
                row.days_since_cross = 1
            row.last_updated = datetime.utcnow()

        db.commit()
        combined_results.extend(new_results)

    if fresh_positive_ids:
        cached_results, _ = find_companies_near_break_even(
            db, months, fresh_positive_ids, threshold_pct=threshold_pct, min_market_cap=request.min_market_cap
        )
        combined_results.extend(cached_results)

    return {"status": "success", "data": combined_results}
