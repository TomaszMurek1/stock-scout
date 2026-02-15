from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
import logging
import time

from database.base import get_db
from database.user import User
from database.company import Company
from database.financials import CompanyFinancials
from database.stock_data import CompanyMarketData
from services.basket_resolver import resolve_baskets_to_companies
from services.company_filter_service import filter_by_market_cap
from services.auth.auth import get_current_user
from services.scan_job_service import create_job, run_scan_task


logger = logging.getLogger(__name__)
router = APIRouter()

class EvToRevenueScanRequest(BaseModel):
    basket_ids: List[int]
    min_ev_to_revenue: float = 0.0
    max_ev_to_revenue: float = 10.0
    min_market_cap: Optional[float] = None

class EvToRevenueResultItem(BaseModel):
    ticker: str
    company_name: str
    ev_to_revenue: float
    market_cap: float
    total_revenue: float
    enterprise_value: float

class EvToRevenueResponse(BaseModel):
    data: List[EvToRevenueResultItem]

def _process_company_ev_revenue(
    db: Session, 
    company: Company, 
    min_ratio: float, 
    max_ratio: float
) -> Optional[EvToRevenueResultItem]:
    try:
        # Get Financials (Revenue, Debt, Cash, EV)
        fin = db.query(CompanyFinancials).filter(CompanyFinancials.company_id == company.company_id).first()
        if not fin:
            return None
            
        # Get Market Data (Market Cap)
        mkt = db.query(CompanyMarketData).filter(CompanyMarketData.company_id == company.company_id).first()
        market_cap = mkt.market_cap if mkt and mkt.market_cap else 0
        
        # Determine EV and Revenue
        ev = fin.enterprise_value
        revenue = fin.total_revenue
        
        # Fallback Calculation for EV if missing
        if ev is None and market_cap > 0 and fin.total_debt is not None and fin.cash_and_cash_equivalents is not None:
            ev = market_cap + fin.total_debt - fin.cash_and_cash_equivalents
            
        if ev is None or revenue is None or revenue == 0:
            return None
            
        ratio = ev / revenue
        
        if min_ratio <= ratio <= max_ratio:
            return EvToRevenueResultItem(
                ticker=company.ticker,
                company_name=company.name,
                ev_to_revenue=round(ratio, 2),
                market_cap=market_cap,
                total_revenue=revenue,
                enterprise_value=ev
            )
            
    except Exception as e:
        logger.warning(f"Error processing {company.ticker} for EV/Rev: {e}")
        return None
        
    return None



def run_ev_to_revenue_scan(db: Session, req: EvToRevenueScanRequest):
    """
    Sync function to be run in background.
    """
    try:
        # 1. Resolve Universe
        try:
            _, companies = resolve_baskets_to_companies(db, req.basket_ids)
        except ValueError as exc:
            # In background task, we can't raise HTTPException to user directly, 
            # but run_scan_task catches exceptions and marks job as FAILED.
            raise exc
            
        if not companies:
            return {"status": "success", "data": []}

        # 2. Filter by Market Cap
        if req.min_market_cap:
            companies = filter_by_market_cap(db, companies, req.min_market_cap)

        results = []
        logger.info(f"Scanning {len(companies)} companies for EV/Revenue...")

        for company in companies:
            item = _process_company_ev_revenue(
                db, company, req.min_ev_to_revenue, req.max_ev_to_revenue
            )
            if item:
                results.append(item.dict()) # Convert Pydantic model to dict for JSON serialization
                
        # Sort by Ratio (Cheapest first)
        results.sort(key=lambda x: x["ev_to_revenue"])
        
        logger.info(f"Found {len(results)} matches.")
        return {"status": "success", "data": results}
        
    except Exception as e:
        logger.error(f"EV/Revenue scan failed: {e}")
        raise e

@router.post("/ev-to-revenue")
def start_ev_to_revenue_scan(
    req: EvToRevenueScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a background job for EV/Revenue scan.
    Returns: { "job_id": "uuid", "status": "PENDING" }
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
        
    # Create Job record
    job = create_job(db, "ev_to_revenue")

    # Define task wrapper
    def task_wrapper(db_session: Session):
        return run_ev_to_revenue_scan(db_session, req)

    # Enqueue background task
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)

    return {"job_id": job.id, "status": "PENDING"}
