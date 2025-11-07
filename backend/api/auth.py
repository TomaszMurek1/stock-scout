from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.base import get_db
from database.token_mgmt import RevokedToken
from database.user import Invitation, User
from services.auth.auth import get_current_user, get_user_by_email, is_user_invitation_valid
from schemas.user_schemas import RefreshTokenRequest, Token, UserCreate, UserLogin
from .security import (
    SECRET_KEY,
    ALGORITHM,
    create_access_token,
    create_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash,
    verify_password,
)
from jose import JWTError, jwt
from fastapi import Request

router = APIRouter()


@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    print("Received registration:", user)
    # Find and validate invitation
    invitation = (
        db.query(Invitation)
        .filter(Invitation.code == user.invitation_code, Invitation.is_active == True)
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=400, detail="Invalid or inactive invitation code."
        )

    if invitation.expires_at and datetime.utcnow() > invitation.expires_at:
        raise HTTPException(status_code=400, detail="Invitation code is expired.")

    if invitation.used_count >= invitation.max_uses:
        raise HTTPException(status_code=400, detail="Invitation usage limit reached.")

    # Check if email is already used
    if db.query(User).filter_by(email=user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        invitation_id=invitation.id,
    )

    # Apply and update invitation
    invitation.used_count += 1
    if invitation.used_count >= invitation.max_uses:
        invitation.is_active = False

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not is_user_invitation_valid(db_user):
        raise HTTPException(
            status_code=403, detail="Your invitation-based access has expired."
        )

    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_token(token_request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(
            token_request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM]
        )

        # TODO: Fully implement token revocation
        revoked = (
            db.query(RevokedToken)
            .filter(RevokedToken.jti == payload.get("jti"))
            .first()
        )
        if revoked:
            raise HTTPException(status_code=401, detail="Revoked token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")

        email = payload.get("sub")
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_access_token = create_access_token(data={"sub": user.email})
        new_refresh_token = create_refresh_token(data={"sub": user.email})

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not hasattr(request.state, "jti"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token information not available",
        )

    db.add(RevokedToken(jti=request.state.jti))
    db.commit()
    return {"message": "Successfully logged out"}
