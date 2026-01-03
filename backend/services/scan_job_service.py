import logging
import traceback
from datetime import datetime
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
        
        # --- SIMULATED DELAY FOR TESTING ---
        import time
        time.sleep(10)
        # ------------------------------------
        
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
