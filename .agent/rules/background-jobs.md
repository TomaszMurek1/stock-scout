# Background Jobs & Data Refresh Convention

## Rule

When **creating or modifying** any backend endpoint that runs long/heavy work (yfinance calls, batch DB operations, scans), **always follow** these conventions.

---

## 1. Use Dedicated Threads, Not BackgroundTasks

Heavy jobs **must** use `start_job_in_thread()` from `services/scan_job_service.py` instead of FastAPI's `BackgroundTasks.add_task()`.

**Why?** `BackgroundTasks` runs sync functions in the same threadpool as API handlers. A long-running job (e.g., refreshing 2000 tickers via yfinance) will starve other API requests, making the entire server unresponsive.

```python
# ✅ Correct — runs in a dedicated daemon thread
from services.scan_job_service import create_job, start_job_in_thread

job = create_job(db, "my_job_type")
start_job_in_thread(job.id, task_wrapper)
return {"job_id": job.id, "status": "PENDING"}

# ❌ Wrong — blocks other API requests
from fastapi import BackgroundTasks
background_tasks.add_task(run_scan_task, job.id, task_wrapper)
```

## 2. Always Check for Duplicate Jobs

Before creating a new job, **always** check if one is already running. Use `get_active_job()`:

```python
from services.scan_job_service import create_job, get_active_job, start_job_in_thread

existing = get_active_job(db, "my_job_type")
if existing:
    return {"job_id": existing.id, "status": existing.status, "already_running": True}

job = create_job(db, "my_job_type")
# ... set up task_wrapper ...
start_job_in_thread(job.id, task_wrapper)
return {"job_id": job.id, "status": "PENDING", "already_running": False}
```

The frontend `useScanJob` hook detects `already_running: true` in the response and shows a `toast.info()` instead of starting duplicate polling.

## 3. Always Include `already_running` in Response

Return `"already_running": True/False` in **all** job-creating endpoint responses so the frontend can distinguish between new jobs and re-attached existing ones.

## 4. Stamp `last_updated` for Skipped Companies

When a batch update function checks whether a company needs a data refresh and determines it does NOT need one, **always stamp the `last_updated` field** on the relevant record (e.g., `CompanyFinancials.last_updated`).

This prevents redundant re-evaluation on subsequent runs the same day.

```python
# ✅ Correct — stamp even when skipping
if should_update_financials(...):
    eligible_tickers.append(comp.ticker)
else:
    # Stamp so we don't re-check this company today
    fn.last_updated = now_utc
    db.merge(fn)
    db.commit()

# ❌ Wrong — only stamping companies that actually got updated
```

## 5. Stale Job Cleanup

`get_active_job()` automatically marks jobs older than 2 hours as `FAILED`. This handles server restarts or crashes where jobs are stuck in `PENDING`/`RUNNING` forever.

**Do not** change the staleness threshold without considering the longest-running job type (currently ~1 hour for a full fundamentals refresh).

## 6. Job Type Naming

Use descriptive, snake_case strings for job types. Include the trigger source as a prefix:

| Prefix | Source | Example |
|--------|--------|---------|
| `n8n_` | n8n automation | `n8n_daily_price_refresh` |
| `admin_` | Admin UI | `admin_daily_price_refresh` |
| (none) | Feature-specific | `populate_price_history`, `golden_cross` |

## Key Files

| File | Purpose |
|------|---------|
| `services/scan_job_service.py` | `create_job`, `get_active_job`, `start_job_in_thread`, `run_scan_task`, `update_job_status` |
| `database/job.py` | `Job` model (id, type, status, result, error, created_at, updated_at) |
| `api/data_refresh.py` | Consolidated price & fundamental refresh endpoints |
| `api/jobs.py` | `GET /jobs/{job_id}` — frontend polls this for status |
| `frontend/src/hooks/useScanJob.ts` | Frontend hook for starting jobs and polling status |
