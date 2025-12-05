# Backend Data Flow & Ingestion

This document outlines how external data (financials, stock prices) enters the system.

## Overview

The system primarily uses a **Lazy Loading** strategy for data ingestion, supplemented by manual **Batch Updates** via the Admin panel. Data is not automatically populated upon company creation (`Company` table insertion) to save resources. Instead, it is fetched when needed or requested.

## Core Data Tables

1.  **`CompanyFinancials`**: Current snapshot of financial data (PE Ratio, Market Cap, etc.).
2.  **`CompanyFinancialHistory`**: Historical annual/quarterly reports (Revenue, Net Income, etc.).
3.  **`StockPriceHistory`**: Daily OHLCV (Open, High, Low, Close, Volume) data.

---

## 1. Financial Data Ingestion

**Goal**: Populate `CompanyFinancials` and `CompanyFinancialHistory`.

### Trigger Points

1.  **Lazy Load (User Access)**:
    *   **Action**: User visits a stock detail page (e.g., `/stock-details/AAPL`).
    *   **Endpoint**: `GET /api/stock-details/{ticker}`
    *   **Logic**: The endpoint checks if the data is "fresh" (thresholds: 350 days for annual, 80 days for quarterly). If stale, it triggers an update.

2.  **Batch Update (Admin)**:
    *   **Action**: Admin clicks "Run Financials Market Update" in the dashboard.
    *   **Endpoint**: `POST /admin/run-financials-market-update`
    *   **Logic**: Iterates through all companies in a market and triggers the update logic for each.

### Code Path

1.  **Entry Point**: `backend/services/yfinance_data_update/data_update_service.py` -> `ensure_fresh_data`
2.  **Core Service**: `backend/services/fundamentals/financials_batch_update_service.py`
    *   **Function**: `fetch_and_save_financial_data_for_list_of_tickers`
    *   **Process**:
        1.  Calls `yfinance.Tickers(tickers)` to fetch batch data.
        2.  Extracts `income_stmt`, `balance_sheet`, `cashflow`.
        3.  Maps pure Yahoo API keys to our DB columns (`build_financial_history_mappings`).
        4.  Performs `db.bulk_insert_mappings` to efficiently insert historical rows.
        5.  Updates the `CompanyFinancials` snapshot row.

---

## 2. Stock Price History Ingestion

**Goal**: Populate `StockPriceHistory` with daily candles.

### Trigger Points

1.  **Lazy Load (User Access)**:
    *   **Action**: User visits a stock detail page.
    *   **Endpoint**: `GET /api/stock-details/{ticker}`
    *   **Logic**: Checks if `StockPriceHistory` exists for the last 2 years. If empty or gaps exist, triggers an update.

2.  **Batch Update (Admin)**:
    *   **Action**: Admin runs market sync or explicitly requests price updates (future feature).
    *   **Endpoint**: N/A (Currently coupled with Financials update or explicit single-stock checks).

### Code Path

1.  **Entry Point**: `backend/services/yfinance_data_update/data_update_service.py` -> `ensure_fresh_data`
2.  **Core Service**: `backend/services/yfinance_data_update/data_update_service.py`
    *   **Function**: `fetch_and_save_stock_price_history_data_batch`
    *   **Process**:
        1.  Calls `yfinance.download(...)` for the given tickers and date range.
        2.  Receives a Pandas DataFrame of OHLCV data.
        3.  Iterates through the DataFrame and maps rows to `StockPriceHistory` objects.
        4.  Performs `db.bulk_insert_mappings`.

---

## Summary of Key Files

| File Path | Purpose |
| :--- | :--- |
| `backend/api/stock_details.py` | API Endpoint that triggers the "Lazy Load" check. |
| `backend/api/admin.py` | API Endpoints for triggering manual/batch updates. |
| `backend/services/yfinance_data_update/data_update_service.py` | **Orchestrator**: Decides *when* to update and calls specific services. Handles Stock Price updates. |
| `backend/services/fundamentals/financials_batch_update_service.py` | **Worker**: Handles parsing Yahoo financial statements and saving `CompanyFinancialHistory`. |
