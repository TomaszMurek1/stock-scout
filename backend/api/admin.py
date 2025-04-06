import secrets
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.base import get_db
from schemas.user_schemas import InvitationCreate, InvitationOut
from database.user import Invitation

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

