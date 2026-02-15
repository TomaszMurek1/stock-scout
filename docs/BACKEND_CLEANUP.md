# Backend Cleanup & Refactor Plan

> **Generated:** 2026-02-15
> Analysis of `backend/` for dead code, duplication, architectural smells, and cleanup opportunities.

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| 🗑️ Dead / debug files to delete | 15 files | Low risk |
| 🔁 Duplicated utility functions | 5 functions × 2–5 copies | Medium |
| 🔁 Golden/Death Cross near-clone | ~670 lines duplicated | High |
| 📦 `positions_service.py` misplaced in `api/` | 1 file (442 lines) | Medium |
| 📦 `valuation_debug.py` — debug route in prod | 1 file | Low |
| 📝 Pydantic schemas defined inline in routes | ~14 route files | Medium |
| 📋 `main.py` duplicate import | 1 duplicate | Low |
| ⚙️ `logging.basicConfig` scattered everywhere | 8 files | Low |
| ⚠️ `Base.metadata.create_all` in prod path | 1 line | Medium |
| 📄 Leftover data/text files | 10 files | Low |
| 🏗️ Fat route files (>400 LOC) | 5 files | Medium |
| 🔀 Inconsistent `get_holdings_for_user` | 2 different implementations | Medium |

---

## 1. 🗑️ Dead / Debug Files to Delete

These are one-off investigation, test, and import scripts at the backend root level. They contain hardcoded DB connections, duplicated logic, and are not referenced by the application.

| File | Purpose | Action |
|------|---------|--------|
| `debug_break_even.py` | Debugging break-even calc | Delete |
| `debug_breakdown_6m.py` | Debugging 6-month breakdown | Delete |
| `debug_income.py` | Debugging income calcs | Delete |
| `debug_portfolio_ttwr.py` | Debugging TTWR calculation | Delete |
| `debug_ttwr_1m.py` | Debugging 1-month TTWR | Delete |
| `trace_ttwr_bug.py` | Tracing TTWR bug | Delete |
| `verify_ttwr_math.py` | Verifying TTWR math | Delete |
| `simulate_dashboard.py` | Simulating dashboard data | Delete |
| `compare_flows.py` | Comparing flow calculations | Delete |
| `check_sells.py` | Checking sell logic | Delete |
| `fix_history.py` | One-off data fix | Delete |
| `analyze_user_metrics.py` | One-off analysis | Delete |
| `investigate_strategy.py` | One-off strategy investigation | Delete |
| `test_batch_fetch.py` | Manual batch test | Delete |
| `test_batch_write.py` | Manual batch test | Delete |
| `test_single_ticker_loader.py` | Manual ticker test | Delete |
| `import_companies.py` | One-off import script | Move to `scripts/` or delete |
| `import_script_acc4.py` | One-off account import | Move to `scripts/` or delete |

**Impact:** ~0 risk. None of these are imported by the running application.

---

## 2. 📄 Leftover Data / Text Files

These files at the backend root are debug artifacts — raw API responses, scratch notes, and probe outputs.

| File | Size | Action |
|------|------|--------|
| `single-ticker-response.json` | 116 KB | Delete |
| `portfolio_management_response.json` | 8 KB | Delete |
| `services/yfinance_probe_response.json` | — | Delete |
| `database/yfinance-probe_SOFI.json` | — | Delete |
| `financial_statements.txt` | 20 KB | Delete |
| `output_AAPL.txt` | 28 KB | Delete |
| `prompt.txt` | 8 KB | Delete |
| `sections_output.txt` | 24 KB | Delete |
| `ttwr_analysis.txt` | 4 KB | Delete |
| `yfinance.Ticker.rst.txt` | 8 KB | Delete |
| `account_50292032_pl_xlsx_*.xlsx` | — | Delete or move to `data/` |
| `account_50315402_pl_xlsx_*.xlsx` | — | Delete or move to `data/` |

---

## 3. 🔁 Duplicated Utility Functions

### `_chunked(seq, size)` — **4 copies**

Identical list-chunking utility duplicated in 4 files:
- `api/golden_cross.py:27`
- `api/death_cross.py:27`
- `api/breakout.py:23`
- `api/admin_price_data.py:29`

**Fix:** Extract to `utils/itertools_helpers.py` and import everywhere.

### `_dec(value) → Decimal` — **5 copies**

Safe Decimal conversion duplicated:
- `api/portfolio_management.py:48`
- `api/positions_service.py:34`
- `api/transactions_transfer_cash.py:25`
- `services/portfolio_snapshot_service.py:8`
- `services/valuation/materialization_service.py:26`

**Fix:** Extract to `utils/decimal_helpers.py`.

### `_to_d(x) → Decimal` — **2 copies** (+ 3 in debug scripts)

- `services/portfolio_metrics_service.py:33`
- `services/portfolio_positions_service.py:21`

**Fix:** Merge with `_dec` into a single `utils/decimal_helpers.py`.

### `resolve_universe(db, market_names, basket_ids)` — **2 copies**

- `api/golden_cross.py:46`
- `api/death_cross.py:46`

Other modules (`breakout.py`, `wyckoff.py`, `choch.py`) already import from `golden_cross` — so `death_cross` is the extra copy.

**Fix:** Extract to `services/scan_universe_resolver.py`.

### `get_markets_and_companies(db, market_names)` — **2 copies**

- `api/golden_cross.py:33`
- `api/death_cross.py:33`

**Fix:** Move alongside `resolve_universe`.

### `_resolve_baskets_or_404` — **2 copies**

- `api/golden_cross.py:76`
- `api/death_cross.py:76`

**Fix:** Move alongside `resolve_universe`.

### `filter_pairs_needing_update` — **2 copies**

- `api/golden_cross.py:115`
- `api/death_cross.py:104`

**Fix:** Parameterize cross type and share implementation.

### `fetch_price_history_for_pairs` — **2 copies**

- `api/golden_cross.py:152`
- `api/death_cross.py:153`

**Fix:** Share implementation.

### `analyze_and_build_results` — **2 copies**

- `api/golden_cross.py:178`
- `api/death_cross.py:178`

**Fix:** Share implementation.

---

## 4. 🔁 Golden Cross / Death Cross — Near-Clone (High Priority)

`golden_cross.py` (334 lines) and `death_cross.py` (337 lines) are **nearly identical files**. They share the same structure, imports, helpers, and analysis flow. The only differences are:

- The cross detection direction (golden = short crosses **above** long; death = **below**).
- Variable/function names (`golden_cross_results` vs `death_cross_results`).
- `_format_result` exists only in `golden_cross.py`.

**Recommended refactor:**

```
services/technical_analysis/
  cross_scan_service.py    # Shared logic parameterized by cross_type ("golden" | "death")
api/
  golden_cross.py          # Thin wrapper: 30-40 lines max
  death_cross.py           # Thin wrapper: 30-40 lines max
```

This would eliminate ~250 lines of duplication.

---

## 5. 📦 Misplaced `api/positions_service.py`

`positions_service.py` (442 lines) sits in `api/` but is a **pure service module** — it has no router, no endpoints, and no FastAPI dependencies. It's imported by:
- `api/transactions.py`
- `api/transactions_transfer.py`
- `api/portfolio_management.py`
- `api/positions_read.py`
- `services/valuation/rematerializ.py`
- `scripts/import_transactions.py`

**Fix:** Move to `services/positions_service.py`. Update all imports accordingly.

---

## 6. 📦 `valuation_debug.py` — Debug Route Exposed

`api/valuation_debug.py` (48 lines) is a debug endpoint (`GET /api/valuation/debug/holdings`) with **no authentication**. It's registered in `main.py` but should not be accessible in production.

**Options:**
1. Delete it entirely if no longer needed.
2. Gate behind `require_admin` dependency.
3. Only register in `main.py` when `ENV != "production"`.

---

## 7. 📝 Inline Pydantic Schemas in Route Files

The project has a `schemas/` directory, but **14 route files** define Pydantic models inline:

| Route file | Inline models |
|------------|--------------|
| `ev_to_revenue.py` | `EvToRevenueScanRequest`, `EvToRevenueResultItem`, `EvToRevenueResponse` |
| `break_even_point.py` | `BreakEvenScanRequest`, `BreakEvenResultItem` |
| `fibonacci_elliott.py` | `Pivot`, `WaveLabel`, `WaveMetrics`, `FiboRetracement`, `AnalysisResponse`, `ScanRequest`, `ScanResultItem`, `ScanResponse` |
| `portfolio_management.py` | `_CashFlowBase`, `DividendIn`, `InterestIn`, `AccountCashFlowIn` |
| `watchlist.py` | `WatchlistAddRequest` |
| `admin.py` | `SyncCompanyMarketsRequest`, `AddCompaniesRequest`, `YFinanceProbeRequest`, `BasketRefreshRequest`, `FetchMarketTickersRequest` |
| `admin_price_data.py` | Various request models |
| `accounts.py` | Account request models |
| `transactions_transfer.py` | Transfer request models |
| `transactions_transfer_cash.py` | Cash transfer models |
| `valuation_series.py` | Series request models |
| `fx.py` | FX request models |
| `ai_advisor.py` | (uses raw Request) |
| `security.py` | Security models |

**Fix:** Create dedicated schema files (e.g., `schemas/scan_schemas.py`, `schemas/admin_schemas.py`, `schemas/transaction_schemas.py`) and import from there. This improves reusability and keeps route files focused on routing.

---

## 8. 📋 `main.py` — Duplicate Import

Line 33-34 in `main.py`:
```python
    admin_price_data,
    admin_price_data,
```

`admin_price_data` is imported **twice**. Python silently ignores this, but it's untidy.

**Fix:** Remove the duplicate line.

---

## 9. ⚙️ Scattered `logging.basicConfig` Calls

`logging.basicConfig` should be called **once** in the application entry point (`main.py`). Currently it's called in **8 separate files**:

| File | Impact |
|------|--------|
| `main.py:45` | ✅ Correct — this is the entry point |
| `api/stock_details.py:42` | ❌ Overrides root config |
| `utils/db_retry.py:5` | ❌ |
| `services/log_misc_yf_data.py:6` | ❌ |
| `services/company/company_service.py:9` | ❌ |
| `services/yfinance_data_update/data_update_service.py:27` | ❌ |
| `services/market/market_service.py:6` | ❌ |
| `services/stock_data/stock_data_service.py:16` | ❌ |

**Fix:** Remove all `logging.basicConfig` calls except the one in `main.py`. Each module should just use `logging.getLogger(__name__)`.

---

## 10. ⚠️ `Base.metadata.create_all` in Production

`main.py:69`:
```python
# Create database tables (only for dev, remove for production)
Base.metadata.create_all(bind=engine)
```

The comment says "remove for production" but it **still runs in production**. With Alembic managing migrations, this is redundant and potentially dangerous.

**Fix:**
```python
if settings.ENV != "production":
    Base.metadata.create_all(bind=engine)
```

---

## 11. 🏗️ Fat Route Files (>400 LOC)

These route files mix routing, business logic, data access, and helper functions:

| File | Lines | Issue |
|------|-------|-------|
| `stock_details.py` | 582 | Company creation, market assignment, logo fetching, dashboard metrics — all in one route file |
| `portfolio_management.py` | 531 | FX rate logic, cash management, trade execution all inline |
| `fibonacci_elliott.py` | 502 | Entire Elliott Wave analysis engine in a route file |
| `positions_service.py` | 442 | Pure service already — just needs to move |
| `watchlist.py` | 414 | Holdings calculation duplicated from `portfolio_positions_service` |

**Fix:** Extract business logic into `services/` and keep route files thin (routing + validation + service call).

---

## 12. 🔀 Two Different `get_holdings_for_user` Implementations

There are **two completely different functions** named `get_holdings_for_user`:

1. **`api/watchlist.py:61`** — Simpler version, returns basic holdings (ticker, name, shares, avg price, last price, currency). Used by watchlist.
2. **`services/portfolio_positions_service.py:311`** — Full version with PnL calculations, multi-period data, FX conversion. Used by dashboard.

**Fix:** The watchlist version should call the positions service and select only the fields it needs, or extract a shared lightweight helper.

---

## Suggested Priority Order

| Priority | Task | Effort | Risk |
|----------|------|--------|------|
| 1 | Delete dead files (§1, §2) | 5 min | None |
| 2 | Fix `main.py` duplicate import (§8) | 1 min | None |
| 3 | Guard `create_all` for dev-only (§10) | 1 min | Low |
| 4 | Remove scattered `basicConfig` (§9) | 10 min | Low |
| 5 | Extract `_chunked` + `_dec` utilities (§3) | 15 min | Low |
| 6 | Move `positions_service.py` to `services/` (§5) | 20 min | Low |
| 7 | Gate/remove `valuation_debug` (§6) | 5 min | Low |
| 8 | Refactor Golden/Death Cross into shared service (§4) | 1-2 hrs | Medium |
| 9 | Move inline schemas to `schemas/` (§7) | 1-2 hrs | Low |
| 10 | Slim down fat route files (§11) | 3-4 hrs | Medium |
| 11 | Unify `get_holdings_for_user` (§12) | 30 min | Medium |
