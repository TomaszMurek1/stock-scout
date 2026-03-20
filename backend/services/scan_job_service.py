import logging
import traceback
import threading
from datetime import datetime, timedelta
from uuid import UUID
from typing import Any, Callable, Dict
from sqlalchemy.orm import Session
from database.job import Job
from database.base import SessionLocal

logger = logging.getLogger(__name__)

def create_job(db: Session, job_type: str) -> Job:
    """Create a new job in PENDING state."""
    job = Job(type=job_type, status="PENDING")
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def get_job(db: Session, job_id: UUID) -> Job:
    """Get job by ID."""
    return db.query(Job).filter(Job.id == job_id).first()


def get_active_job(db: Session, job_type: str, max_age_hours: int = 2) -> Job | None:
    """
    Return an active (PENDING or RUNNING) job of the given type, if any.
    Jobs older than max_age_hours are considered stale (server restart, crash)
    and are automatically marked as FAILED so they don't block new jobs.
    """
    cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)

    active_jobs = (
        db.query(Job)
        .filter(Job.type == job_type, Job.status.in_(["PENDING", "RUNNING"]))
        .order_by(Job.created_at.desc())
        .all()
    )

    for job in active_jobs:
        if job.created_at < cutoff:
            # Stale job — mark as failed so it doesn't block forever
            job.status = "FAILED"
            job.error = "Marked as stale (exceeded max age)"
            db.commit()
            logger.warning(f"Marked stale job {job.id} ({job_type}) as FAILED")
            continue
        return job  # Found a recent active job

    return None

def update_job_status(db: Session, job_id: UUID, status: str, result: Any = None, error: str = None):
    """Update job status and result/error."""
    job = get_job(db, job_id)
    if job:
        job.status = status
        if result is not None:
            job.result = result
        if error is not None:
            job.error = error
        db.commit()

def run_scan_task(job_id: UUID, task_func: Callable[[Session], Any]):
    """
    Generic wrapper to run a background task.
    Manages DB session and updates Job status/result.
    """
    db = SessionLocal()
    try:
        update_job_status(db, job_id, "RUNNING")
        
        # Execute the actual task logic
        result_data = task_func(db)
        
        # If task_func returns a dict with "status": "success", extract "data" if present
        # This adapts to existing scan functions that return {"status": "success", "data": ...}
        final_result = result_data
        if isinstance(result_data, dict) and result_data.get("status") == "success":
             final_result = result_data.get("data", result_data)

        update_job_status(db, job_id, "COMPLETED", result=final_result)
        logger.info(f"Job {job_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        logger.error(traceback.format_exc())
        update_job_status(db, job_id, "FAILED", error=str(e))
    finally:
        db.close()


def start_job_in_thread(job_id: UUID, task_func: Callable[[Session], Any]):
    """
    Run a scan task in a dedicated daemon thread.
    Unlike BackgroundTasks.add_task (which uses the same threadpool as API
    handlers), this creates a separate thread so heavy jobs cannot starve
    normal API requests.
    """
    thread = threading.Thread(
        target=run_scan_task,
        args=(job_id, task_func),
        daemon=True,
        name=f"job-{job_id}",
    )
    thread.start()
    logger.info(f"Started job {job_id} in dedicated thread {thread.name}")
