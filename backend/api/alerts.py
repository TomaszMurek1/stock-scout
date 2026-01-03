from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.base import get_db
from database.alert import Alert, AlertType
from database.company import Company
from schemas.alert_schemas import AlertCreate, AlertUpdate, AlertResponse
from services.auth.auth import get_current_user

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Get all alerts for the current user."""
    return db.query(Alert).filter(Alert.user_id == user.id).all()

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Create a new alert."""
    # Find company ID if possible
    company = db.query(Company).filter(Company.ticker == alert.ticker.upper()).first()
    company_id = company.company_id if company else None

    # Optional: Basic duplicates check?
    # For now, we allow multiple alerts for same ticker/type as thresholds might differ.

    new_alert = Alert(
        user_id=user.id,
        ticker=alert.ticker.upper(),
        company_id=company_id,
        alert_type=alert.alert_type,
        threshold_value=alert.threshold_value,
        message=alert.message
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    alert_update: AlertUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Update an existing alert."""
    db_alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    update_data = alert_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_alert, key, value)

    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Delete an alert."""
    db_alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user.id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(db_alert)
    db.commit()
    return None

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_alerts(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Delete ALL alerts for user."""
    db.query(Alert).filter(Alert.user_id == user.id).delete()
    db.commit()
    return None
