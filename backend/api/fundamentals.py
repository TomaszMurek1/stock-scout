import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.base import get_db
from database.market import Market
from database.company import Company
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

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ev-to-revenue")
def ev_revenue_scan(request: EVRevenueScanRequest, db: Session = Depends(get_db)):
    """
    Search for companies in the specified markets whose Enterprise Value to
    Revenue ratio falls within a certain range.
    """
    if not request.markets:
        raise HTTPException(status_code=400, detail="No markets specified.")

    # 1) Find relevant markets
    markets = db.query(Market).filter(Market.name.in_(request.markets)).all()
    market_ids = [m.market_id for m in markets]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found in DB.")

    # 2) Gather companies in these markets (ONE-TO-MANY)
    companies = db.query(Company).filter(Company.market_id.in_(market_ids)).all()
    if not companies:
        raise HTTPException(status_code=404, detail="No companies found.")

    logger.info(f"Scanning {len(companies)} companies in markets: {request.markets}")

    for market in markets:
        companies = (
            db.query(Company).filter(Company.market_id == market.market_id).all()
        )
        if not companies:
            continue

        tickers = [company.ticker for company in companies]

        # Batch fetch, which now returns info about delisted tickers
        fetch_and_save_stock_price_history_data_batch(
            tickers=tickers,
            market_name=market.name,
            db=db,
            start_date=None,
            end_date=None,
            force_update=False,
        )
        db.commit()

    # 3) Fetch/update financial data if necessary...
    # (One-to-many: use .market)
    for c in companies:
        if c.market and c.market.market_id in market_ids:
            update_financials_for_tickers(
                db=db,
                tickers=[c.ticker],
                market_name=c.market.name,
            )

    # 4) Query `CompanyFinancials` table
    q = (
        db.query(CompanyFinancials)
        .join(Company)
        .filter(CompanyFinancials.market_id.in_(market_ids))
        .filter(CompanyFinancials.enterprise_value.isnot(None))
        .filter(CompanyFinancials.total_revenue.isnot(None))
        .filter(CompanyFinancials.total_revenue != 0)  # Add this line!
    )

    # Calculate EV-to-Revenue dynamically (since it's not stored in DB)
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
    if not matches:
        raise HTTPException(
            status_code=404, detail="No companies match the EV-to-Revenue criteria."
        )

    # 5) Format response
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


@router.post("/break-even-companies")
def get_break_even_companies(
    request: BreakEvenPointRequest, db: Session = Depends(get_db)
):
    # Possibly refresh for ALL companies (or only certain ones).
    # Then analyze CompanyFinancialHistory table to find break-even crossing.

    months = 12  # TODO: adjust month later to be taken from api call

    # 1) Find relevant markets
    market_ids = [
        m.market_id
        for m in db.query(Market).filter(Market.name.in_(request.markets)).all()
    ]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found in DB.")

    # 2) Find companies in those markets (ONE-TO-MANY)
    companies = db.query(Company).filter(Company.market_id.in_(market_ids)).all()
    company_ids = [comp.company_id for comp in companies]
    tickers = [comp.ticker for comp in companies]
    print(f"[DEBUG] Matched companies: {len(tickers)}")

    # 3) Ensure fresh data for each company and its market
    for comp in companies[146:147]:
        print(f"[DEBUG] {comp.ticker} ({comp.name})")
        if comp.market:
            ensure_fresh_data(comp.ticker, comp.market.name, True, db)
        else:
            ensure_fresh_data(comp.ticker, "Unknown", True, db)

    # 4) Break-even logic using the now-updated CompanyFinancialHistory
    results = find_companies_near_break_even(db, months, company_ids, threshold_pct=5.0)
    return {"status": "success", "data": results}
