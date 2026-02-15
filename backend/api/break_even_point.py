from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
import logging

from database.base import get_db
from database.company import Company
from database.financials import CompanyFinancials
from database.stock_data import CompanyMarketData
from services.basket_resolver import resolve_baskets_to_companies
from services.company_filter_service import filter_by_market_cap
from services.auth.auth import get_current_user
from database.user import User
from services.scan_job_service import create_job, run_scan_task

logger = logging.getLogger(__name__)
router = APIRouter()

class BreakEvenScanRequest(BaseModel):
    basket_ids: List[int]
    threshold_pct: float = 5.0  # Margin within +/- 5%
    min_market_cap: Optional[float] = None

class BreakEvenResultItem(BaseModel):
    ticker: str
    company_name: str
    current_net_income: float
    currency: str = "USD"
    net_margin_pct: float

def _process_company_break_even(
    db: Session,
    company: Company,
    threshold_pct: float
) -> Optional[dict]:
    try:
        fin = db.query(CompanyFinancials).filter(CompanyFinancials.company_id == company.company_id).first()
        if not fin or fin.total_revenue is None or fin.net_income is None:
            return None
        
        revenue = fin.total_revenue
        income = fin.net_income
        
        if revenue == 0:
            return None
            
        margin = (income / revenue) * 100.0
        
        # Check if margin is within +/- threshold
        if abs(margin) <= threshold_pct:
            currency = "USD"
            if company.market and company.market.currency:
                currency = company.market.currency
            elif company.currency:
                currency = company.currency

            return {
                "ticker": company.ticker,
                "company_name": company.name,
                "current_net_income": income,
                "currency": currency,
                "net_margin_pct": round(margin, 2)
            }
    except Exception as e:
        # Log debug only to avoid spam
        # logger.debug(f"Failed to process {company.ticker}: {e}")
        return None
    return None

def run_break_even_scan(db: Session, req: BreakEvenScanRequest):
    """
    Background task logic for Break Even scan.
    Finds companies with Net Profit Margin close to 0 (within threshold_pct).
    """
    try:
        # 1. Resolve Universe
        try:
            _, companies = resolve_baskets_to_companies(db, req.basket_ids)
        except ValueError as exc:
            raise exc
            
        if not companies:
            return {"status": "success", "data": []}

        # 2. Filter by Market Cap
        if req.min_market_cap:
            companies = filter_by_market_cap(db, companies, req.min_market_cap)

        results = []
        logger.info(f"Scanning {len(companies)} companies for Break Even Point...")

        for company in companies:
            item = _process_company_break_even(db, company, req.threshold_pct)
            if item:
                results.append(item)
                
        # Sort by proximity to 0 margin (closest to break even first)
        results.sort(key=lambda x: abs(x["net_margin_pct"]))
        
        logger.info(f"Found {len(results)} matches.")
        return {"status": "success", "data": results}
        
    except Exception as e:
        logger.error(f"Break Even scan failed: {e}")
        raise e

@router.post("/break-even-point")
def start_break_even_scan(
    req: BreakEvenScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start a background job for Break Even Point scan.
    Returns: { "job_id": "uuid", "status": "PENDING" }
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
        
    job = create_job(db, "break_even_point")

    def task_wrapper(db_session: Session):
        return run_break_even_scan(db_session, req)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)

    return {"job_id": job.id, "status": "PENDING"}
