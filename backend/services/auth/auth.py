# dependencies/auth.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database.base import get_db
from database.user import User
from core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        raise credentials_exception

    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def is_user_invitation_valid(user: User) -> bool:
    if not user.invitation:
        return False
    valid_until = user.created_at + timedelta(days=user.invitation.duration_days)
    return datetime.utcnow() <= valid_until
