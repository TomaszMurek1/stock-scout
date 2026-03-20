# Backend Data Flow & Ingestion

This document outlines how external data (financials, stock prices) enters the system.

## Overview

The system uses three strategies for data ingestion:

1. **Lazy Loading** — data is fetched on-demand when a user visits a stock detail page.
2. **Admin Batch Updates** — admin triggers refreshes via the consolidated Data Refresh page (`/admin/data-refresh`).
3. **n8n Scheduled Updates** — automated daily refreshes triggered by n8n workflows after market close.

Data is not automatically populated upon company creation (`Company` table insertion) to save resources.

## Core Data Tables

1.  **`CompanyFinancials`**: Current snapshot of financial data (PE Ratio, Market Cap, etc.).
2.  **`CompanyFinancialHistory`**: Historical annual/quarterly reports (Revenue, Net Income, etc.).
3.  **`StockPriceHistory`**: Daily OHLCV (Open, High, Low, Close, Volume) data.
4.  **`CompanyMarketData`**: Real-time market data (current price, market cap, volume).
5.  **`Jobs`**: Tracks background task status (PENDING → RUNNING → COMPLETED/FAILED).

---

## 1. Financial Data Ingestion

**Goal**: Populate `CompanyFinancials` and `CompanyFinancialHistory`.

### Trigger Points

1.  **Lazy Load (User Access)**:
    *   **Action**: User visits a stock detail page (e.g., `/stock-details/AAPL`).
    *   **Endpoint**: `GET /api/stock-details/{ticker}`
    *   **Logic**: Checks if data is "fresh" (thresholds: 350 days for annual, 80 days for quarterly). If stale, triggers an update.

2.  **Admin — Refresh All**:
    *   **Action**: Admin clicks "Refresh All Companies" under Fundamental Data on the Data Refresh page.
    *   **Endpoint**: `POST /n8n/admin-daily-fundamentals`
    *   **Logic**: Iterates ALL companies across ALL markets and triggers update logic for each.

3.  **Admin — Refresh by Basket**:
    *   **Action**: Admin selects specific baskets and clicks "Refresh Selected".
    *   **Endpoint**: `POST /admin/run-financials-baskets`
    *   **Logic**: Resolves basket → companies, then triggers update logic.

4.  **n8n Daily Automation**:
    *   **Endpoint**: `POST /n8n/n8n-daily-fundamentals` (internal token auth)
    *   **Logic**: Same as Admin Refresh All, but triggered by n8n scheduler.

### Smart Skip Logic

`update_financials_for_tickers()` in `financials_batch_update_service.py` applies these checks **per company** to avoid wasteful API calls:

| Check | Condition | Action |
|-------|-----------|--------|
| **Already checked today** | `CompanyFinancials.last_updated >= today` | Skip immediately |
| **Known delisted/failed** | `CompanyMarketData.market_cap == 0` and updated < 7 days ago | Skip |
| **Reports are fresh** | Annual < 350 days old AND Quarterly < 80 days old | Skip, **stamp `last_updated`** |
| **Needs update** | Otherwise | Fetch from yfinance |

> **Key**: The `last_updated` stamp is set for ALL checked companies — both those that needed an update and those confirmed as fresh. This prevents redundant re-evaluation on subsequent runs the same day.

### Code Path

1.  **Entry Point**: `backend/api/data_refresh.py` → `_run_daily_fundamentals()`
2.  **Filter**: `backend/services/fundamentals/financials_batch_update_service.py` → `update_financials_for_tickers()`
3.  **Worker**: same file → `fetch_and_save_financial_data_for_list_of_tickers()`
    *   Calls `yfinance.Tickers(tickers)` to fetch batch data.
    *   Extracts `income_stmt`, `balance_sheet`, `cashflow`.
    *   Maps Yahoo API keys to DB columns (`build_financial_history_mappings`).
    *   Performs `db.bulk_insert_mappings` to efficiently insert historical rows.
    *   Updates the `CompanyFinancials` snapshot row.

---

## 2. Stock Price History Ingestion

**Goal**: Populate `StockPriceHistory` with daily candles.

### Trigger Points

1.  **Lazy Load (User Access)**:
    *   **Action**: User visits a stock detail page.
    *   **Endpoint**: `GET /api/stock-details/{ticker}`
    *   **Logic**: Checks if `StockPriceHistory` exists for the last 2 years. If empty or gaps exist, triggers an update.

2.  **Admin — Refresh All**:
    *   **Action**: Admin clicks "Refresh All Companies" under Price Data on the Data Refresh page.
    *   **Endpoint**: `POST /n8n/admin-daily-prices`
    *   **Logic**: Fetches price history for ALL companies across ALL markets.

3.  **Admin — Refresh by Basket**:
    *   **Action**: Admin selects specific baskets and clicks "Refresh Selected".
    *   **Endpoint**: `POST /admin/populate-price-history`
    *   **Logic**: Resolves basket → companies, then fetches price data.

4.  **n8n Daily Automation**:
    *   **Endpoint**: `POST /n8n/n8n-daily-prices` (internal token auth)
    *   **Logic**: Same as Admin Refresh All, but triggered by n8n scheduler.

### Code Path

1.  **Entry Point**: `backend/api/data_refresh.py` → `_run_daily_prices()`
2.  **Worker**: `backend/services/yfinance_data_update/data_update_service.py` → `fetch_and_save_stock_price_history_data_batch()`
    *   Calls `yfinance.download(...)` for the given tickers and date range.
    *   Receives a Pandas DataFrame of OHLCV data.
    *   Iterates through the DataFrame and maps rows to `StockPriceHistory` objects.
    *   Performs `db.bulk_insert_mappings`.

---

## 3. Job Execution Architecture

### Dedicated Thread Execution

All data refresh jobs run in **dedicated daemon threads** (via `start_job_in_thread()` in `scan_job_service.py`), separate from the API handler threadpool. This prevents long-running yfinance batch operations from blocking normal API requests.

### Duplicate Job Prevention

Every refresh endpoint checks for existing PENDING/RUNNING jobs of the same type before creating a new one:

```python
existing = get_active_job(db, "admin_daily_price_refresh")
if existing:
    return {"job_id": existing.id, "status": existing.status, "already_running": True}
```

The frontend detects `already_running: true` and shows a `toast.info()` while tracking the existing job.

### Stale Job Cleanup

Jobs stuck in PENDING/RUNNING for more than **2 hours** (e.g., due to server restart) are automatically marked as FAILED by `get_active_job()`, preventing permanent blocking.

### Job Types

| Endpoint | Job Type |
|----------|----------|
| `POST /n8n/n8n-daily-prices` | `n8n_daily_price_refresh` |
| `POST /n8n/n8n-daily-fundamentals` | `n8n_daily_fundamentals_refresh` |
| `POST /n8n/admin-daily-prices` | `admin_daily_price_refresh` |
| `POST /n8n/admin-daily-fundamentals` | `admin_daily_fundamentals_refresh` |
| `POST /admin/populate-price-history` | `populate_price_history` |
| `POST /admin/run-financials-baskets` | `financials_basket_refresh` |
| `POST /admin/run-financials-market-update` | `financials_market_update` |

---

## 4. Summary of Key Files

| File Path | Purpose |
| :--- | :--- |
| `backend/api/data_refresh.py` | Consolidated endpoints for all price & fundamental refreshes (Admin + n8n). |
| `backend/api/admin.py` | Basket-scoped financial refresh, company management. |
| `backend/api/admin_price_data.py` | Basket-scoped price history refresh. |
| `backend/api/stock_details.py` | API Endpoint that triggers the "Lazy Load" check. |
| `backend/services/scan_job_service.py` | Job creation, status tracking, `start_job_in_thread()`, duplicate prevention. |
| `backend/services/yfinance_data_update/data_update_service.py` | **Orchestrator**: Decides *when* to update prices and calls specific services. |
| `backend/services/fundamentals/financials_batch_update_service.py` | **Worker**: Handles parsing Yahoo financial statements and saving `CompanyFinancialHistory`. |

---

## 5. Scans & Analysis

Certain "Scans" in the application also trigger data ingestion to ensure results are accurate.

### Golden Cross Scan
*   **Frontend**: `golden-cross-page.tsx`
*   **Endpoint**: `POST /api/technical-analysis/golden-cross`
*   **Data Refreshed**:
    *   **Stock Prices**: **YES**. It checks for stale data and calls `fetch_and_save_stock_price_history_data_batch`.
    *   **Financials**: **NO**. It relies on existing market metadata and computed moving averages.

### Break Even Point Scan
*   **Frontend**: `break-even-point-page.tsx`
*   **Endpoint**: `POST /api/fundamentals/break-even-companies`
*   **Data Refreshed**:
    *   **Stock Prices**: **NO**.
    *   **Financials**: **YES**. It now triggers `update_financials_for_tickers` for all involved markets, ensuring up-to-date quarterly reports.

### Market Cap Filtering (Golden Cross)
The Golden Cross scan includes a **Market Cap Filter** optimization.
*   **Mechanism**: It filters companies *before* fetching prices by checking `CompanyMarketData.market_cap` in the database.
*   **Optimization**: This significantly reduces API calls by ignoring small-cap stocks.

---

## 6. Company Market Data Lifecycle

**`CompanyMarketData`** (including `market_cap`) is a special case.

### Initialization & Updates
*   **Does "Add Company" populate it?**: **NO**. Newly added companies have `NULL` market data.
*   **Does "Golden Cross Scan" populate it?**: **NO**. Scans only fetch price history.
*   **What populates it?**: The **Fundamentals Refresh** (any variant).
    *   `update_financials_for_tickers` calls `update_market_data` using the `fast_info` object from Yahoo Finance.

### Maintenance Recommendation
To keep `market_cap` and financial statements fresh without overloading the API:
1.  **Frequency**: Run the fundamentals refresh via the Admin Data Refresh page or let n8n handle it daily.
2.  **Efficiency**: The system automatically skips companies already checked today and those with recent reports (< 80 days old for quarterly, < 350 days for annual), so running this frequently is low-cost after the initial population.
