# Backend Cleanup Plan

## Summary

This document catalogues all code-quality issues found in the Stock Scout backend
and records cleanup actions already taken plus planned next steps.  Items are
grouped by category and ranked **P0** (done / must-do) through **P3** (nice-to-have).

---

## ✅ Already Completed (This Session)

### 1. Dead / Debug Files Removed
**15+ Python files** (`debug_*.py`, `trace_*.py`, `simulate_*.py`) and **~10
leftover data files** (`.json`, `.txt`, `.xlsx`) deleted from the backend root.

### 2. `main.py` Hardened
| Fix | Detail |
|-----|--------|
| Duplicate import removed | `admin_price_data` was imported twice |
| `create_all` guarded | Only runs in non-prod (`settings.ENV != "production"`) |
| `valuation_debug` protected | Endpoint now requires `require_admin` |
| Logging level adjusted | `INFO` in prod, `DEBUG` otherwise |

### 3. Logging Standardised (7 files)
Removed scattered `logging.basicConfig()` calls from:
- `api/stock_details.py`
- `utils/db_retry.py`
- `services/log_misc_yf_data.py`
- `services/company/company_service.py`
- `services/yfinance_data_update/data_update_service.py`
- `services/market/market_service.py`
- `services/stock_data/stock_data_service.py`

Root logger is now configured **only** in `main.py`.

### 4. Shared `chunked()` Utility Extracted
Created `utils/itertools_helpers.py` with a canonical `chunked()` generator.
Replaced **5 duplicate `_chunked` definitions** across:
- `api/golden_cross.py`
- `api/death_cross.py`
- `api/breakout.py`
- `api/choch.py` (was importing from golden_cross)
- `api/wyckoff.py` (was importing from golden_cross)
- `api/admin_price_data.py`

### 5. Shared Scan Universe Resolver Extracted
Created `services/scan_universe_resolver.py` with:
- `resolve_universe()`
- `get_markets_and_companies()`
- `_resolve_baskets_or_404()`

Removed **~55 lines of duplicated code** from each of `golden_cross.py` and
`death_cross.py`.  Updated `breakout.py`, `choch.py`, and `wyckoff.py` to import
from the shared service instead of `api.golden_cross`.

### 6. Shared `to_decimal()` Utility Created
Created `utils/decimal_helpers.py` with a canonical `to_decimal()` function.
*(Actual replacement of inline `_dec`/`_to_d` calls deferred — see P1 below.)*

---

## 🔴 P0 — High Priority (Should Be Next)

### A. Golden / Death Cross Near-Clone (~670 lines duplicated)
`golden_cross.py` and `death_cross.py` share nearly identical functions:
- `load_existing_*_analysis()`
- `filter_pairs_needing_update()`
- `fetch_price_history_for_pairs()`
- `analyze_and_build_results()`
- `run_*_scan()`

**Action:** Extract a generic `CrossScanService` parameterised by
`cross_type = "golden" | "death"`.  Each route file becomes a thin wrapper.

**Estimated savings:** ~300 lines.

### B. Move `api/positions_service.py` → `services/`
This 442-line file is a pure service (no router, no `APIRouter`).
It only belongs in `api/` by accident.

**Action:** `git mv api/positions_service.py services/positions_service.py`.
Update all imports (≈3-4 files).

### C. Inconsistent `get_holdings_for_user`
Two implementations exist:
1. `services/portfolio_positions_service.py` → `get_holdings_for_user()`
2. `api/valuation_preview.py` → `get_holdings_for_user()` (or similar)

**Action:** Audit call-sites, pick the canonical version, delete the other.

---

## 🟡 P1 — Medium Priority

### D. Replace Inline `_dec` / `_to_d` with `utils.decimal_helpers.to_decimal`
Files with local definitions:
| File | Function Name |
|------|---------------|
| `api/positions_service.py` | `_dec` |
| `api/portfolio_management.py` | `_dec` |
| `api/transactions_transfer_cash.py` | `_dec` |
| `services/portfolio_snapshot_service.py` | `_dec` |
| `services/valuation/materialization_service.py` | `_dec` (most robust variant) |
| `services/portfolio_metrics_service.py` | `_to_d` |
| `services/portfolio_positions_service.py` | `_to_d` |

**Action:** In each file, replace `from decimal import …` + local `_dec`/`_to_d`
with `from utils.decimal_helpers import to_decimal as _dec` (or rename all
call-sites).  Tackle one file at a time with tests.

> ⚠️ `materialization_service.py` uses `_dec` **~60 times** across 741 lines —
> do this file last and test thoroughly.

### E. Inline Pydantic Schemas → `schemas/`
14 route files define Pydantic models inline.  Key offenders:

| File | Models |
|------|--------|
| `api/portfolio_management.py` | `_CashFlowBase`, `DividendIn`, `InterestIn`, `AccountCashFlowIn` |
| `api/admin_price_data.py` | `PriceHistoryRequest` |
| `api/transactions_transfer_cash.py` | `TransferCashRequest` |
| `api/valuation_materialize.py` | Various request/response models |
| `api/account.py` | Account CRUD models |

**Action:** Move to `schemas/portfolio_schemas.py`, `schemas/admin_schemas.py`,
etc.  Import from there.

### F. Fat Route Files (>400 lines, mixing routing + logic + DB access)
| File | Lines | Main Issue |
|------|-------|------------|
| `api/portfolio_management.py` | 531 | Business logic in route handlers |
| `api/positions_service.py` | 442 | Pure service in wrong dir (see P0-B) |
| `api/stock_details.py` | ~480 | Mixing API fetch + DB queries |
| `api/valuation_materialize.py` | ~500 | Heavy calculation inline |
| `api/golden_cross.py` | 280* | Still has scan logic inline |

**Action:** For each, extract a `services/<domain>_service.py` and have routes
delegate to it.

---

## 🟢 P2 — Low Priority / Nice-to-Have

### G. `portfolio_management.py` Custom Logger Setup
Lines 25-36 create a custom handler instead of relying on root config:
```python
log = logging.getLogger("api.portfolio_management")
if not log.handlers:
    handler = logging.StreamHandler()
    ...
```
**Action:** Remove custom handler setup; rely on root configuration from `main.py`.

### H. `death_cross.py` Duplicate `except` Clause (Fixed)
The original had a duplicated `except ValueError` in `_resolve_baskets_or_404`.
This was fixed when the file was rewritten to use the shared resolver.

### I. Unused Imports Audit
Run `autoflake --check` or `ruff check --select F401` to identify unused imports
across the codebase.

### J. Type Hints Consistency
Many functions use bare `dict`, `list` instead of `Dict`, `List` from typing.
Standardise on Python 3.10+ syntax (`dict[str, int]`) or `from __future__ import
annotations`.

---

## 🔵 P3 — Aspirational

### K. Test Coverage
No automated tests exist for the services layer.  Priority test targets:
1. `positions_service.py` — `apply_transaction_to_position` / `recompute_position`
2. `materialization_service.py` — `run_materialize_day` / `run_materialize_range`
3. `portfolio_metrics_service.py` — TWR / MWRR calculations

### L. API Versioning
All routes are under `/api/`.  Consider `/api/v1/` prefix for future-proofing.

### M. Database Access Layer
Raw SQLAlchemy queries are scattered across routes and services.  Consider a thin
repository / DAO layer for the most-accessed models (`Transaction`, `Company`,
`StockPriceHistory`).

---

## File Reference

| New Shared Module | Purpose |
|---|---|
| `utils/itertools_helpers.py` | `chunked()` |
| `utils/decimal_helpers.py` | `to_decimal()` |
| `services/scan_universe_resolver.py` | `resolve_universe()`, `get_markets_and_companies()` |
