# GMMA 24-Line + Volatility Squeeze Scanner

## Overview

Detects **GMMA compression breakouts** using the Borawski Volatility Squeeze method. 
Scans 24 EMA lines grouped into 3 bands, identifies when bands compress (squeeze) and then expand (breakout) in either uptrend or downtrend direction.

## Architecture

```
[Frontend Form] → POST /api/technical-analysis/gmma-squeeze → [Background Job]
                                                                    ↓
[Frontend Poll] ← GET /api/jobs/{id} ← [run_gmma_scan] → chunked processing
                                                                    ↓
[Chart Page]   ← GET /api/technical-analysis/gmma-squeeze/chart/{ticker}
[n8n Telegram] ← POST /api/technical-analysis/gmma-squeeze/report
```

## GMMA Band System

24 Exponential Moving Averages split into 3 groups:

| Band | Periods | Meaning |
|------|---------|---------|
| **Red** (short-term) | 3, 5, 7, 9, 11, 13, 15, 17, 19, 21 | Traders |
| **Blue** (medium-term) | 25, 30, 35, 40, 45, 50, 55, 60 | Investors |
| **Green** (long-term) | 65, 70, 75, 80, 85, 90 | Institutions |

From each band, 5 edge values are extracted:
- `czerw_top` / `czerw_bot` — Red band top/bottom
- `nieb_top` / `nieb_bot` — Blue band top/bottom  
- `ziel_top` — Green band top

EMA columns are **dropped immediately** after edge extraction to free RAM.

## Signal Logic

### Indicators Computed

| Indicator | Formula | Purpose |
|-----------|---------|---------|
| **Starter%** | `abs(czerw_top − nieb_bot) / nieb_bot × 100`, smoothed by rolling(N) | Gap between Red and Blue bands |
| **Red Width%** | `(czerw_top − czerw_bot) / czerw_bot × 100`, smoothed | Internal spread of Red band |
| **Blue Width%** | `(nieb_top − nieb_bot) / nieb_bot × 100`, smoothed | Internal spread of Blue band |

### T-1 / T0 Signal Detection

Signal triggers when ALL conditions are met:

```
1. TREND (T0):
   UP:   close > SMA200 AND czerw_bot > nieb_top AND nieb_bot > ziel_top
   DOWN: close < SMA200 AND czerw_top < nieb_bot AND nieb_top < ziel_top

2. COMPRESSION (T-1):
   Starter% ≤ compression_threshold (default: 3%)

3. BAND WIDTH (T-1):     ← NEW: prevents late signals
   Red Width%  ≤ band_width_threshold (default: 5%)
   Blue Width% ≤ band_width_threshold (default: 5%)

4. EXPANSION (T0):
   Starter%(T0) > Starter%(T-1)

5. BREAKOUT (T0):
   UP:   close > czerw_top
   DOWN: close < czerw_bot
```

### Why Band Width Matters

Without band width check:
```
Starter% can be low (2%) because gap between bands is small,
but Red/Blue bands themselves are WIDE (8-10%) — meaning
trend already developed. This is NOT a true squeeze.
```

With band width check:
```
True squeeze = ALL 24 EMA lines converge:
  ✓ Gap between bands is small (Starter% ≤ 3%)
  ✓ Red band itself is narrow (Red Width% ≤ 5%)
  ✓ Blue band itself is narrow (Blue Width% ≤ 5%)
```

## Configurable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `compression_threshold` | 3.0% | Max Starter% at T-1 for compression |
| `band_width_threshold` | 5.0% | Max Red/Blue internal width at T-1 |
| `starter_smoothing` | 3 | Rolling window for smoothing |
| `session_limit` | 200 | Sessions to load per ticker |
| `trend_filter` | "both" | "up", "down", or "both" |
| `min_market_cap` | — | Min market cap in millions USD |

## API Endpoints

### Frontend Scan
```
POST /api/technical-analysis/gmma-squeeze
Auth: Bearer token
Body: { basket_ids, min_market_cap, compression_threshold, 
        band_width_threshold, starter_smoothing, session_limit, trend_filter }
Returns: { job_id, status: "PENDING" }
```

### Chart Data
```
GET /api/technical-analysis/gmma-squeeze/chart/{ticker}
Auth: Bearer token
Returns: { ticker, data: [{ date, close, sma_200, czerw_top, czerw_bot, nieb_top, nieb_bot, ziel_top }] }
```

### n8n Report
```
POST /api/technical-analysis/gmma-squeeze/report
Auth: X-InternalToken header
Params: compression_threshold=5%, band_width_threshold=5%, min_market_cap=50M USD
Returns: { bot_token, messages: [{ chat_id, text, parse_mode }] }
```
**Scan strategy:**
- **Uptrends**: ALL companies (entire market) — global scan, run once
- **Downtrends**: only user's holdings + watchlist — per-user scan

## Memory Optimization

- **Chunking**: Processes 300 tickers per batch
- **Float32**: All numerics downcast from float64 → saves 50% RAM
- **Immediate Drop**: 24 EMA columns dropped after edge extraction
- **GC**: `gc.collect()` after each chunk

## Files

| File | Purpose |
|------|---------|
| `backend/services/gmma_scanner.py` | Core engine: EMA, edges, indicators, signal detection |
| `backend/api/gmma.py` | API endpoints (scan, chart, n8n report) |
| `backend/schemas/stock_schemas.py` | `GmmaSqueezeRequest` Pydantic schema |
| `frontend/.../gmma-squeeze-form.helpers.ts` | Zod schema + form field config |
| `frontend/.../gmma-squeeze-form.tsx` | Form component with zustand cache |
| `frontend/.../gmma-squeeze-output.tsx` | Result list with trend badges |
| `frontend/.../gmma-squeeze-chart.tsx` | Recharts GMMA band chart |
| `frontend/.../gmma-chart-page.tsx` | Full-page chart view |
| `frontend/.../gmma-squeeze-store.ts` | Zustand store for result caching |
