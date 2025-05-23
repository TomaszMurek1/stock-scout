import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.base import get_db
from schemas.user_schemas import InvitationCreate, InvitationOut
from database.user import Invitation
from services.fundamentals.financials_batch_update_service import (
    update_financials_for_tickers,
)


router = APIRouter()


@router.get("/health-check")
async def health_check():
    return {"status": "Admin API is working!"}


@router.post("/invitations", response_model=InvitationOut)
def create_invitation(payload: InvitationCreate, db: Session = Depends(get_db)):
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
def run_financials_batch_update(market_name: str, db: Session = Depends(get_db)):
    try:
        from database.market import Market
        from database.company import Company

        results = []
        markets = db.query(Market).all()
        for market in markets:
            tickers = [
                c.ticker
                for c in db.query(Company)
                .join(Company.markets)
                .filter(Market.market_id == market.market_id)
                .all()
            ]
            if not tickers:
                continue
            result = update_financials_for_tickers(db, tickers, market.name)
            results.append({"market": market.name, "result": result})

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
