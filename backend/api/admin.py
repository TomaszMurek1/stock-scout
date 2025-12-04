import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.base import get_db
from schemas.user_schemas import InvitationCreate, InvitationOut
from database.user import Invitation
from services.auth.auth import get_current_user
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
    _: str = Depends(get_current_user),
):
    """List available markets for synchronization."""
    return get_available_markets()


@router.post("/invitations", response_model=InvitationOut)
def create_invitation(
    payload: InvitationCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    code = secrets.token_urlsafe(16)  # unique/secure token
    invitation = Invitation(
        code=code,
        duration_days=payload.duration_days,
        max_uses=payload.max_uses,
        expires_at=payload.expires_at,
        is_active=True,
        used_count=0,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.post("/run-financials-market-update")
def run_financials_batch_update(
    market_name: str | None = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    try:
        from database.market import Market
        from database.company import Company

        results = []
        markets = db.query(Market).all()
        if market_name:
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
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-financials-baskets")
def run_financials_for_baskets(
    payload: BasketRefreshRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    if not payload.basket_ids:
        raise HTTPException(status_code=400, detail="basket_ids are required")
    market_ids, companies = resolve_baskets_to_companies(db, payload.basket_ids)
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


@router.post("/sync-company-markets")
def sync_companies_to_markets(
    payload: SyncCompanyMarketsRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = sync_company_markets(
        db, force=payload.force, limit=payload.limit, start_from_id=payload.start_from_id
    )
    return result


@router.post("/add-companies")
def add_companies(
    payload: AddCompaniesRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Add new companies by ticker list OR by market code (fetches tickers)."""
    if payload.market_code:
        return add_companies_for_market(db, payload.market_code)

    if payload.tickers:
        return add_companies_via_yfinance(db, payload.tickers)

    raise HTTPException(status_code=400, detail="Must provide tickers or market_code")


@router.post("/yfinance-probe")
def yfinance_probe(
    payload: YFinanceProbeRequest,
    _: str = Depends(get_current_user),
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
