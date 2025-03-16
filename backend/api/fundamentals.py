import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db
from database.models import Company, Market, company_market_association, CompanyFinancials
from schemas.fundamentals_schemas import BreakEvenPointRequest, EVRevenueScanRequest
from services.financial_data_service import fetch_and_save_financial_data
from services.break_even_companies import  find_companies_with_break_even

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/ev-to-revenue")
def ev_revenue_scan(
    request: EVRevenueScanRequest,
    db: Session = Depends(get_db)
):
    """
    Search for companies in the specified markets whose Enterprise Value to Revenue ratio
    falls within a certain range.
    """
    if not request.markets:
        raise HTTPException(status_code=400, detail="No markets specified.")

    # 1) Find relevant markets
    market_ids = [
        m[0] for m in (
            db.query(Market.market_id)
              .filter(Market.name.in_(request.markets))
              .all()
        )
    ]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found in DB.")

    # 2) Gather companies in these markets
    companies = (
        db.query(Company)
        .join(company_market_association)
        .join(Market)
        .filter(Market.market_id.in_(market_ids))
        .all()
    )
    if not companies:
        raise HTTPException(status_code=404, detail="No companies found.")

    logger.info(f"Scanning {len(companies)} companies in markets: {request.markets}")

    # 3) Fetch/update financial data if necessary
    for c in companies[:10]:  # Limit for testing
        for m in c.markets:
            if m.market_id in market_ids:
                fetch_and_save_financial_data(c.ticker, m.name, db)

    # 4) Query `CompanyFinancials` table
    q = (
        db.query(CompanyFinancials)
        .join(Company)
        .filter(CompanyFinancials.market_id.in_(market_ids))
        .filter(CompanyFinancials.enterprise_value.isnot(None))  # Avoid NULLs
        .filter(CompanyFinancials.total_revenue.isnot(None))  # Avoid NULLs
    )

    # Calculate EV-to-Revenue dynamically (since it's not stored in DB)
    if request.min_ev_to_revenue is not None:
        q = q.filter(
            (CompanyFinancials.enterprise_value / CompanyFinancials.total_revenue) >= request.min_ev_to_revenue
        )
    if request.max_ev_to_revenue is not None:
        q = q.filter(
            (CompanyFinancials.enterprise_value / CompanyFinancials.total_revenue) <= request.max_ev_to_revenue
        )

    matches = q.all()
    if not matches:
        raise HTTPException(status_code=404, detail="No companies match the EV-to-Revenue criteria.")

    logger.info(f"EV-to-Revenue Query Found {len(matches)} results")

    # 5) Format response
    results = []
    for item in matches:
        ev_to_revenue = (
            item.enterprise_value / item.total_revenue
            if item.enterprise_value is not None and item.total_revenue not in (None, 0)
            else "N/A"
        )
        results.append({
            "ticker": item.company.ticker,
            "company_name": item.company.name,
            "market": item.market.name,
            "ev_to_revenue": ev_to_revenue,
            "enterprise_value": item.enterprise_value if item.enterprise_value is not None else "N/A",
            "total_revenue": item.total_revenue if item.total_revenue is not None else "N/A",
            "last_updated": item.last_updated.isoformat() if item.last_updated else None
        })

    return {"status": "success", "data": results}


@router.post("/break-even-companies")
def get_break_even_companies(request: BreakEvenPointRequest, db: Session = Depends(get_db)):
    # Possibly refresh for ALL companies (or only certain ones).
    # Then analyze CompanyFinancialHistory table to find break-even crossing.
    
    # TODO: adjust month later to be taken from api call
    months=12
    # 1) Find relevant markets
    market_ids = [
        m[0] for m in (
            db.query(Market.market_id)
              .filter(Market.name.in_(request.markets))
              .all()
        )
    ]
    if not market_ids:
        raise HTTPException(status_code=404, detail="No matching markets found in DB.")
    
    companies = (
        db.query(Company)
        .join(company_market_association)
        .join(Market)
        .filter(Market.market_id.in_(market_ids))
        .all()
    )
    company_ids = [comp.company_id for comp in companies]
    for comp in companies[:10]:
        for m in comp.markets:
            fetch_and_save_financial_data(comp.ticker, m.name, db)
    
    # break-even logic using the now-updated CompanyFinancialHistory
    results = find_companies_with_break_even(db, months, company_ids)
    logger.info(results)
    return {"status": "success", "data": results}
