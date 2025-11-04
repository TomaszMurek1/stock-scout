# dependencies/auth.py

import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.base import get_db
from database.user import User
from core.config import settings
from fastapi.security import HTTPBearer
oauth2_scheme = HTTPBearer()


logger = logging.getLogger("uvicorn.error")  # guaranteed to show in Docker logs



def get_current_user(
    token: HTTPAuthorizationCredentials = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT, validate, and return authenticated user (case-insensitive email match)."""

    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_str = token.credentials  # Extract the actual JWT string
    logger.info(f"🔐 Incoming token (first 20): {token_str[:20]}...")

    try:
        payload = jwt.decode(
            token_str, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        logger.info(f"✅ Decoded payload: {payload}")

        user_email: str = payload.get("sub")
        if not user_email:
            logger.warning("❌ Missing 'sub' claim in token")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"❌ JWT decode error: {str(e)}")
        raise credentials_exception

    user = (
        db.query(User)
        .filter(func.lower(User.email) == user_email.lower())
        .first()
    )

    if not user:
        logger.warning(f"❌ No user found for email: {user_email}")
        raise credentials_exception

    logger.info(f"✅ Authenticated user: {user.email} (ID: {user.id})")
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def is_user_invitation_valid(user: User) -> bool:
    if not user.invitation:
        return False

    print("User's invitation:", user.invitation)

    duration_days: Optional[int] = user.invitation.duration_days
    if duration_days is None:
        print("Invitation has no duration_days, treating as invalid.")
        return False

    try:
        valid_until = user.created_at + timedelta(days=duration_days)
        print("User's valid_until:", valid_until)
        return datetime.utcnow() <= valid_until
    except Exception as e:
        print("Error calculating valid_until:", e)
        return False
