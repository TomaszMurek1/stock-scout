"""
API endpoints for managing user SMA alert preferences.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.base import get_db
from database.user import User
from database.user_alert_preferences import UserAlertPreferences
from services.auth.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class AlertPreferencesResponse(BaseModel):
    sma50_cross_above: bool = False
    sma50_cross_below: bool = False
    sma200_cross_above: bool = False
    sma200_cross_below: bool = False
    sma50_distance_25: bool = False
    sma50_distance_50: bool = False
    sma200_distance_25: bool = False
    sma200_distance_50: bool = False


class AlertPreferencesUpdate(BaseModel):
    sma50_cross_above: bool | None = None
    sma50_cross_below: bool | None = None
    sma200_cross_above: bool | None = None
    sma200_cross_below: bool | None = None
    sma50_distance_25: bool | None = None
    sma50_distance_50: bool | None = None
    sma200_distance_25: bool | None = None
    sma200_distance_50: bool | None = None


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=AlertPreferencesResponse)
def get_preferences(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get current user's SMA alert preferences."""
    prefs = db.query(UserAlertPreferences).filter(
        UserAlertPreferences.user_id == user.id
    ).first()

    if not prefs:
        return AlertPreferencesResponse()

    return AlertPreferencesResponse(
        sma50_cross_above=prefs.sma50_cross_above,
        sma50_cross_below=prefs.sma50_cross_below,
        sma200_cross_above=prefs.sma200_cross_above,
        sma200_cross_below=prefs.sma200_cross_below,
        sma50_distance_25=prefs.sma50_distance_25,
        sma50_distance_50=prefs.sma50_distance_50,
        sma200_distance_25=prefs.sma200_distance_25,
        sma200_distance_50=prefs.sma200_distance_50,
    )


@router.put("/", response_model=AlertPreferencesResponse)
def update_preferences(
    body: AlertPreferencesUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update user's SMA alert preferences (partial update)."""
    prefs = db.query(UserAlertPreferences).filter(
        UserAlertPreferences.user_id == user.id
    ).first()

    if not prefs:
        prefs = UserAlertPreferences(user_id=user.id)
        db.add(prefs)

    # Apply only provided fields
    update_data = body.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)

    logger.info(f"Updated alert preferences for user {user.id}: {update_data}")

    return AlertPreferencesResponse(
        sma50_cross_above=prefs.sma50_cross_above,
        sma50_cross_below=prefs.sma50_cross_below,
        sma200_cross_above=prefs.sma200_cross_above,
        sma200_cross_below=prefs.sma200_cross_below,
        sma50_distance_25=prefs.sma50_distance_25,
        sma50_distance_50=prefs.sma50_distance_50,
        sma200_distance_25=prefs.sma200_distance_25,
        sma200_distance_50=prefs.sma200_distance_50,
    )
