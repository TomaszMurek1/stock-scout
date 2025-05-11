from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    invitation_code: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class InvitationCreate(BaseModel):
    duration_days: int = 7
    max_uses: int = 1
    expires_at: Optional[datetime] = None


class InvitationOut(BaseModel):
    code: str
    duration_days: int
    max_uses: int
    used_count: int
    is_active: bool
    expires_at: Optional[datetime]

    class Config:
        orm_mode = True
