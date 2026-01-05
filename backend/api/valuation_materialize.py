from __future__ import annotations

from datetime import date
import logging

from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from database.base import get_db
from services.scan_job_service import create_job, run_scan_task
from services.valuation.materialization_service import run_materialize_day, run_materialize_range

router = APIRouter()
log = logging.getLogger(__name__)

# ---------- endpoints ----------

@router.post("/materialize-day", operation_id="valuation_materializeDay")
def materialize_day(
    background_tasks: BackgroundTasks,
    portfolio_id: int,
    as_of: date,
    db: Session = Depends(get_db),
):
    job = create_job(db, "materialize_day")
    def task_wrapper(db_session: Session):
        return run_materialize_day(portfolio_id, as_of, db_session)
    
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}


@router.post("/materialize-range", operation_id="valuation_materializeRange")
def materialize_range(
    background_tasks: BackgroundTasks,
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    job = create_job(db, "materialize_range")
    def task_wrapper(db_session: Session):
        return run_materialize_range(portfolio_id, start, end, db_session)
    
    background_tasks.add_task(run_scan_task, job.id, task_wrapper)
    return {"job_id": job.id, "status": "PENDING"}
