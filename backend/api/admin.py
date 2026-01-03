import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.base import get_db
from schemas.user_schemas import InvitationCreate, InvitationOut
from database.user import Invitation, User, UserScope
from services.auth.auth import get_current_user
from services.auth.authorization import require_admin, require_admin_or_demo
from services.company_market_sync import (
    sync_company_markets,
    add_companies_via_yfinance,
    add_companies_for_market,
    get_available_markets,
)
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)
from services.admin_yfinance_probe import gather_yfinance_snapshot
from services.basket_resolver import resolve_baskets_to_companies
from services.scan_job_service import create_job, run_scan_task


class SyncCompanyMarketsRequest(BaseModel):
    force: bool = False
    limit: int | None = None
    start_from_id: int | None = None


class AddCompaniesRequest(BaseModel):
    tickers: list[str] | None = None
    market_code: str | None = None


class YFinanceProbeRequest(BaseModel):
    ticker: str
    include_quarterly: bool = True


class BasketRefreshRequest(BaseModel):
    basket_ids: list[int]


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health-check")
async def health_check():
    return {"status": "Admin API is working!"}


@router.get("/available-markets")
def list_available_markets(
    _: str = Depends(require_admin_or_demo),  # Demo can view
):
    """List available markets for synchronization."""
    return get_available_markets()


@router.post("/invitations", response_model=InvitationOut)
def create_invitation(
    payload: InvitationCreate,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),  # Only admin can create
):
    code = secrets.token_urlsafe(16)  # unique/secure token
    invitation = Invitation(
        code=code,
        duration_days=payload.duration_days,
        max_uses=payload.max_uses,
        scope=payload.scope,
        is_active=True,
        used_count=0,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.get("/invitations", response_model=list[InvitationOut])
def list_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_demo),  # Demo can view
):
    """List all invitations. Anonymizes codes for non-admin users."""
    invitations = db.query(Invitation).order_by(Invitation.created_at.desc()).all()
    
    # Anonymize invitation codes for non-admin users
    if current_user.scope != UserScope.ADMIN:
        for inv in invitations:
            if len(inv.code) > 2:
                # Show only first 1 and last 1 characters
                inv.code = f"{inv.code[0]}••••{inv.code[-1]}"
            else:
                inv.code = "••••"
    
    return invitations


def run_financials_market_update_task(db: Session, market_name: str | None = None):
    try:
        from database.market import Market
        from database.company import Company

        results = []
        markets = db.query(Market).all()
        if market_name and market_name.lower() != "all":
            markets = [m for m in markets if m.name == market_name]
        for market in markets:
            tickers = [
                c.ticker
                for c in db.query(Company)
                .filter(Company.market_id == market.market_id)
                .all()
            ]
            if not tickers:
                continue
            result = update_financials_for_tickers(db, tickers, market.name)
            results.append({"market": market.name, "result": result})

        return {"status": "success", "results": results}
    except Exception as e:
        logger.error(f"Financials update failed: {e}")
        raise e  # Propagate to job handler

@router.post("/run-financials-market-update")
def run_financials_batch_update(
    background_tasks: BackgroundTasks,
    market_name: str | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),  # Only admin can modify
):
    job = create_job(db, "financials_market_update")

    def task_wrapper(db_session: Session):
        return run_financials_market_update_task(db_session, market_name)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}


def run_financials_for_baskets_task(db: Session, basket_ids: list[int]):
    market_ids, companies = resolve_baskets_to_companies(db, basket_ids)
    if not companies:
        return {"status": "success", "results": [], "message": "No companies resolved"}

    from collections import defaultdict

    tickers_by_market: dict[str, list[str]] = defaultdict(list)
    for comp in companies:
        if comp.market and comp.market.name:
            tickers_by_market[comp.market.name].append(comp.ticker)

    if not tickers_by_market:
        return {"status": "success", "results": [], "message": "No markets resolved"}

    results = []
    for market_name, tickers in tickers_by_market.items():
        res = update_financials_for_tickers(db, tickers, market_name)
        results.append({"market": market_name, "tickers": tickers, "result": res})
    return {"status": "success", "results": results}


@router.post("/run-financials-baskets")
def run_financials_for_baskets(
    payload: BasketRefreshRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    if not payload.basket_ids:
        raise HTTPException(status_code=400, detail="basket_ids are required")
    
    job = create_job(db, "financials_basket_refresh")

    def task_wrapper(db_session: Session):
        return run_financials_for_baskets_task(db_session, payload.basket_ids)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}


@router.post("/sync-company-markets")
def sync_companies_to_markets(
    payload: SyncCompanyMarketsRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    result = sync_company_markets(
        db, force=payload.force, limit=payload.limit, start_from_id=payload.start_from_id
    )
    return result


class FetchMarketTickersRequest(BaseModel):
    market_code: str


@router.post("/fetch-market-tickers")
def fetch_tickers_from_market_code(
    payload: FetchMarketTickersRequest,
    _: str = Depends(require_admin_or_demo),
):
    """Fetch all tickers for a given market code (e.g. 'NMS', 'NYQ')."""
    from services.ticker_discovery_service import fetch_tickers_by_market
    
    try:
        tickers = fetch_tickers_by_market(payload.market_code)
        return {"tickers": tickers, "count": len(tickers)}
    except Exception as e:
        logger.error(f"Failed to fetch tickers for {payload.market_code}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/add-companies")
def add_companies(
    payload: AddCompaniesRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Add new companies by ticker list OR by market code (fetches tickers)."""
    if payload.market_code:
        return add_companies_for_market(db, payload.market_code)

    if payload.tickers:
        return add_companies_via_yfinance(db, payload.tickers)

    raise HTTPException(status_code=400, detail="Must provide tickers or market_code")

def run_add_companies_task(db: Session, payload: AddCompaniesRequest):
    if payload.market_code:
        return add_companies_for_market(db, payload.market_code)

    if payload.tickers:
        return add_companies_via_yfinance(db, payload.tickers)

@router.post("/add-companies-job")
def add_companies_job(
    payload: AddCompaniesRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Asynchronously add companies by market code or ticker list."""
    if not payload.market_code and not payload.tickers:
         raise HTTPException(status_code=400, detail="Must provide tickers or market_code")
    
    job = create_job(db, "add_companies")
    
    def task_wrapper(db_session: Session):
        return run_add_companies_task(db_session, payload)
        
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    
    return {"job_id": job.id, "status": "PENDING"}


@router.post("/yfinance-probe")
def yfinance_probe(
    payload: YFinanceProbeRequest,
    _: str = Depends(require_admin_or_demo),
):
    try:
        return gather_yfinance_snapshot(
            payload.ticker, include_quarterly=payload.include_quarterly
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("yfinance probe failed for %s", payload.ticker)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch yfinance data: {exc}"
        ) from exc
