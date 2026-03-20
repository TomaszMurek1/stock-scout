# SMA Distance Backtest — Implementation Plan

## Objective

Build a backtest that answers: **"When a stock's price deviates ≥X% from its SMA (50 or 200), what happens to the price over the next 1W / 1M / 3M / 6M?"**

This tests the **mean-reversion hypothesis** — do extreme SMA distances predict future returns?

---

## Prerequisites

### Database: `StockPriceHistory` table

- **Location:** `backend/database/stock_data.py` → class `StockPriceHistory`
- **Schema:**
  ```
  stock_price_history (partitioned by market_id)
  ├── data_id (PK, autoincrement)
  ├── company_id (FK → companies.company_id)
  ├── market_id (FK → markets.market_id)
  ├── date (Date, indexed)
  ├── open, high, low, close, adjusted_close (Float)
  ├── volume (Integer)
  └── created_at (DateTime)
  ```
- **Partitioned by:** `LIST (market_id)` — PostgreSQL list partitioning
- **Index:** `idx_stockpricehistory_company_market_date` on `(company_id, market_id, date)`
- **Constraint:** `uq_company_market_date` unique on `(company_id, market_id, date)`

### ⚠️ Known Issue: DB Performance

The `stock_price_history` table is very large and queries hang. Before starting the backtest, investigate and fix:

1. **Check if partitions exist:**
   ```sql
   SELECT inhrelid::regclass AS partition_name
   FROM pg_inherits
   WHERE inhparent = 'stock_price_history'::regclass;
   ```
   If no partitions exist, the partitioned table has no storage — data may not be queryable.

2. **Check table size:**
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('stock_price_history'));
   ```

3. **Check for locks:**
   ```sql
   SELECT pid, state, query, wait_event_type
   FROM pg_stat_activity
   WHERE datname = 'stock_scout_db' AND state != 'idle';
   ```

4. **Add indexes if missing:**
   ```sql
   -- Essential for the backtest queries
   CREATE INDEX IF NOT EXISTS idx_sph_company_date
   ON stock_price_history (company_id, date);
   ```

**Fix the DB performance first before proceeding with the backtest.**

---

## Architecture

```
backend/
├── api/
│   └── backtest.py              ← New API endpoint (optional, for frontend)
├── services/
│   └── sma_backtest.py          ← Core backtest logic
└── scripts/
    └── run_sma_backtest.py      ← Standalone CLI runner
```

---

## Step-by-Step Implementation

### Step 1: Fix DB access & verify data

**Goal:** Ensure `stock_price_history` is queryable and has sufficient data.

1. Connect to DB via `docker compose exec dev_db psql -U stockscout_user -d stock_scout_db`
2. Run the diagnostic queries from Prerequisites above
3. If partitions are missing, create them (check existing code for partition creation logic)
4. Verify data exists: `SELECT COUNT(*) FROM stock_price_history LIMIT 1;`
5. Check date coverage for a sample company:
   ```sql
   SELECT company_id, MIN(date), MAX(date), COUNT(*)
   FROM stock_price_history
   WHERE company_id = (SELECT company_id FROM companies LIMIT 1)
   GROUP BY company_id;
   ```

**Minimum data requirement:** At least 200 trading days of history per stock (to compute SMA 200).

---

### Step 2: Create the backtest service

**File:** `backend/services/sma_backtest.py`

#### 2a. Data loading function

```python
def load_price_series(db: Session, company_id: int) -> pd.DataFrame:
    """
    Load daily close prices for a company from StockPriceHistory.
    Returns DataFrame with columns: [date, close], sorted by date.
    """
```

- Query `StockPriceHistory` filtered by `company_id`, ordered by `date`
- Return as a pandas DataFrame with `date` as index and `close` column
- Use `adjusted_close` if available, fallback to `close`

#### 2b. SMA computation

```python
def compute_sma_distance(df: pd.DataFrame, sma_period: int) -> pd.DataFrame:
    """
    Add columns: sma_{period}, pct_distance
    pct_distance = ((close - sma) / sma) * 100
    """
```

- Use `pandas.DataFrame.rolling(window=sma_period).mean()` to compute SMA
- Calculate percentage distance: `((close - sma) / sma) * 100`
- Drop rows where SMA is NaN (first N rows)

#### 2c. Signal detection

```python
def find_signals(
    df: pd.DataFrame,
    threshold_pct: float = 17.5,
    direction: str = "both",  # "above", "below", "both"
) -> pd.DataFrame:
    """
    Find all dates where |pct_distance| >= threshold.
    Returns DataFrame with: [date, close, sma, pct_distance, signal_type]
    signal_type is "above" or "below"
    """
```

- Filter rows where `abs(pct_distance) >= threshold_pct`
- Add `signal_type` column: "above" if positive, "below" if negative
- **Deduplication:** If a stock stays above threshold for 30 consecutive days, that's 1 signal, not 30. Use a cooldown period (e.g., only take the first day of each "episode", then skip until the stock returns within threshold)

#### 2d. Forward return calculation

```python
def compute_forward_returns(
    df: pd.DataFrame,
    signal_dates: list[date],
    periods: dict[str, int] = {"1W": 5, "1M": 21, "3M": 63, "6M": 126},
) -> pd.DataFrame:
    """
    For each signal date, compute the return over the next N trading days.
    Returns DataFrame with: [signal_date, close_at_signal, period, forward_return_pct]
    """
```

- For each signal date, look ahead N trading days in the price series
- Calculate return: `((close_future - close_signal) / close_signal) * 100`
- Handle edge cases: signal too close to end of data → skip

#### 2e. Aggregation

```python
def aggregate_results(
    forward_returns: pd.DataFrame,
) -> dict:
    """
    Compute summary statistics across all signals.
    Returns: {
        period: {
            "count": int,
            "median_return": float,
            "mean_return": float,
            "win_rate": float,  # % of positive returns
            "p25": float,
            "p75": float,
        }
    }
    """
```

---

### Step 3: Create the CLI runner script

**File:** `backend/scripts/run_sma_backtest.py`

```python
"""
Run SMA distance backtest across all companies with sufficient history.

Usage (inside Docker):
    python scripts/run_sma_backtest.py --sma 200 --threshold 17.5 --min-history 300

Output: prints summary table + saves CSV with all signals.
"""
```

#### Flow:

1. Parse args: `--sma` (50 or 200), `--threshold` (default 17.5), `--min-history` (default 300 days), `--output` (CSV path)
2. Query all `company_id`s that have ≥ `min_history` rows in `stock_price_history`
3. For each company:
   a. Load price series
   b. Compute SMA + distance
   c. Find signals (with deduplication)
   d. Compute forward returns
   e. Collect results
4. Aggregate across all companies
5. Print summary table
6. Save detailed signal CSV

#### Expected output:

```
═══════════════════════════════════════════════════════════════
  SMA 200 Distance Backtest — Threshold: ≥17.5%
  Companies: 1,847  |  Signals: 4,231  |  Date range: 2020–2026
═══════════════════════════════════════════════════════════════

  ABOVE SMA (price ≥ 17.5% above SMA 200)
  Signals: 1,892

  Period │ Median Return │ Mean Return │ Win Rate │ P25    │ P75
  ───────┼───────────────┼─────────────┼──────────┼────────┼───────
  1W     │     -0.8%     │    -1.2%    │   42%    │ -3.1%  │ +1.5%
  1M     │     -2.1%     │    -3.4%    │   38%    │ -7.2%  │ +2.8%
  3M     │     -3.5%     │    -4.8%    │   35%    │ -12.1% │ +4.2%
  6M     │     -4.2%     │    -5.1%    │   40%    │ -15.3% │ +6.1%

  BELOW SMA (price ≥ 17.5% below SMA 200)
  Signals: 2,339

  Period │ Median Return │ Mean Return │ Win Rate │ P25    │ P75
  ───────┼───────────────┼─────────────┼──────────┼────────┼───────
  1W     │     +1.2%     │    +1.8%    │   56%    │ -2.1%  │ +4.5%
  1M     │     +3.4%     │    +5.1%    │   61%    │ -3.2%  │ +9.8%
  3M     │     +6.8%     │    +8.4%    │   65%    │ -4.5%  │ +15.2%
  6M     │     +9.2%     │   +11.3%    │   68%    │ -5.1%  │ +22.1%
```

---

### Step 4 (Optional): API endpoint

**File:** `backend/api/backtest.py`

```python
@router.post("/sma-distance")
def run_sma_backtest(
    sma_period: int = 200,        # 50 or 200
    threshold_pct: float = 17.5,  # minimum distance %
    min_history_days: int = 300,  # minimum data requirement
    company_ids: list[int] = None, # optional: specific companies
    db: Session = Depends(get_db),
):
    """Run backtest and return results as JSON."""
```

- Register in `main.py` as `/api/backtest/sma-distance`
- Only expose to admin users or protect with internal token
- Returns the aggregated results + optional detailed signal list

---

### Step 5 (Optional): Frontend visualization

If you want to display results in the app later, create a page under the admin section:

- Table showing the summary statistics
- Chart showing distribution of forward returns (histogram)
- Scatter plot: SMA distance vs forward return
- Filter by SMA period, threshold, direction

---

## Configuration Parameters

| Parameter | Default | Description |
|---|---|---|
| `sma_period` | 200 | SMA window (50 or 200) |
| `threshold_pct` | 17.5 | Minimum % distance to trigger signal |
| `cooldown_days` | 21 | After a signal, skip this many days before next signal (dedup) |
| `forward_periods` | 5, 21, 63, 126 | Trading days for 1W, 1M, 3M, 6M |
| `min_history_days` | 300 | Minimum price history rows per company |
| `use_adjusted_close` | True | Use adjusted close if available |

---

## Dependencies

- `pandas` — already available (used elsewhere in the project)
- `numpy` — already available
- `sqlalchemy` — already available
- No new packages needed

---

## Execution

```bash
# Inside Docker container
docker compose -f docker-compose.dev.yml exec backend bash
cd /app
python scripts/run_sma_backtest.py --sma 200 --threshold 17.5

# Or with custom params
python scripts/run_sma_backtest.py --sma 50 --threshold 10 --min-history 100 --output /app/backtest_results.csv
```

---

## Key Considerations

1. **Signal deduplication is critical.** Without cooldown, a stock that stays 20% below SMA for 60 days generates 60 signals — heavily biasing results toward that one episode.

2. **Survivorship bias.** Your DB only has stocks that currently exist. Stocks that went bankrupt or were delisted may be missing, which biases results positively (especially for "below SMA" signals).

3. **Look-ahead bias.** The SMA must be computed only from data available at signal date — using `rolling().mean()` on historical data naturally avoids this.

4. **Market regime.** Consider splitting results by market regime (bull/bear) using e.g. S&P 500 SMA 200 as a filter.

5. **Sector analysis.** Some sectors (e.g., tech) may behave differently from others (e.g., utilities). Consider grouping by sector if the data is available.
