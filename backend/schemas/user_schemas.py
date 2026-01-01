from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from database.user import UserScope


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
    scope: UserScope = UserScope.BASIC_ACCESS


class InvitationOut(BaseModel):
    id: int
    code: str
    duration_days: int
    max_uses: int
    used_count: int
    is_active: bool
    scope: UserScope
    created_at: datetime

    class Config:
        orm_mode = True
