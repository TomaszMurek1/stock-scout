from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import User
from schemas import UserCreate, UserLogin, Token
from utils import get_password_hash, verify_password, create_access_token
import logging

router = APIRouter()

logger = logging.getLogger("uvicorn")  # Or configure your own logger

@router.post("/register", response_model=dict)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Received registration request for email: {user.email}")
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        logger.warning(f"Email already registered: {user.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        hashed_password = get_password_hash(user.password)
        logger.debug(f"Hashed password: {hashed_password[:10]}...")  # Print part of it
        new_user = User(username=user.username, email=user.email, password_hash=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"User registered successfully: {new_user}")
        return {"message": "User registered successfully"}
    except Exception as e:
        logger.error(f"Error during user registration: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}
