"""Death-cross scan route — thin wrapper around the shared cross-scan service."""

import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.base import get_db
from database.user import User
from schemas.stock_schemas import DeathCrossRequest
from services.auth.auth import get_current_user
from services.cross_scan_service import run_cross_scan
from services.scan_job_service import create_job, run_scan_task

router = APIRouter()
logger = logging.getLogger(__name__)


def run_death_cross_scan(db: Session, request: DeathCrossRequest) -> dict:
    """Execute a death-cross scan (called from background task)."""
    return run_cross_scan(
        db,
        cross_type="death",
        markets=request.markets,
        basket_ids=request.basket_ids,
        short_window=request.short_window,
        long_window=request.long_window,
        days_to_look_back=request.days_to_look_back,
        min_volume=request.min_volume,
        adjusted=request.adjusted,
        min_market_cap=request.min_market_cap,
    )


@router.post("/death-cross")
def start_death_cross_scan(
    request: DeathCrossRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a background job for Death Cross scan.

    Returns: ``{"job_id": "uuid", "status": "PENDING"}``
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required"
        )
    if not request.markets and not request.basket_ids:
        raise HTTPException(
            status_code=400, detail="Select at least one market or basket."
        )

    job = create_job(db, "death_cross")

    def task_wrapper(db_session: Session):
        return run_death_cross_scan(db_session, request)

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}
