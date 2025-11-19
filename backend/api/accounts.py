from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List
from database.base import get_db  # your session dependency
from database.account import Account
from database.portfolio import Portfolio

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

class AccountCreate(BaseModel):
    portfolio_id: int
    name: str = Field(..., max_length=100)
    account_type: str = Field(..., max_length=30)  # e.g., "brokerage", "bank", "wallet"
    currency: str | None = Field(None, min_length=3, max_length=3)

class AccountRead(BaseModel):
    id: int
    portfolio_id: int
    name: str
    account_type: str
    currency: str | None
    cash: Decimal

    class Config:
        from_attributes = True

@router.get("/by-portfolio/{portfolio_id}", response_model=List[AccountRead], operation_id="accounts_listByPortfolio")
def list_accounts_by_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    return db.query(Account).filter(Account.portfolio_id == portfolio_id).order_by(Account.name).all()

@router.post("", response_model=AccountRead, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    # Validate portfolio exists
    portfolio = db.query(Portfolio).filter(Portfolio.id == payload.portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Enforce unique (portfolio_id, name)
    exists = db.query(Account).filter(
        Account.portfolio_id == payload.portfolio_id,
        Account.name == payload.name
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Account with this name already exists in this portfolio")

    acc = Account(
        portfolio_id=payload.portfolio_id,
        name=payload.name,
        account_type=payload.account_type,
        currency=payload.currency,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc
