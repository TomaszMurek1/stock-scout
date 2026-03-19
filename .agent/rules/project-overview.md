# Stock Scout — Project Overview

> **Last updated:** 2026-03-19
> Master reference file for AI assistants, new contributors, and the project owner.

---

## ⚙️ Self-Maintenance Rule

**After completing each task**, the AI assistant **must ask the user** whether this file (`.agent/rules/project-overview.md`) should be updated. Do **not** auto-update — always prompt for confirmation first.

### When to propose an update

- A **new API route** was added or an existing one was renamed/removed.
- A **new database model** was created or columns were changed.
- A **new frontend route or feature module** was added.
- A **new dependency** was introduced (backend or frontend).
- A **coding convention** was established or changed during the task.
- An **architectural decision** was made (e.g. new state management pattern, new service integration).
- The **directory structure** changed significantly (new top-level folders, reorganised features).
- **Environment variables** were added or removed.
- Any existing rule in this document was **contradicted or superseded** by the work done.

### How to prompt

At the end of the task, ask:
> *"This task introduced [brief summary of changes]. Would you like me to update `project-overview.md` to reflect this?"*

If the user confirms, update only the relevant section(s) and bump the `Last updated` date.

---

## 1. What Is Stock Scout?

Stock Scout (branded **StockScan Pro** in the invitation system) is a **self-hosted, full-stack investment research platform**. It lets registered users:

- **Manage multi-account portfolios** — buy/sell, transfers, deposits, dividends, fees/taxes.
- **Run technical-analysis scans** — Golden Cross, Death Cross, CHoCH, Wyckoff, Breakout/Consolidation, Fibonacci-Elliott, EV-to-Revenue, Break-Even Point.
- **Browse stock "One-Pager" deep dives** — fundamentals, price charts, valuation metrics, company notes.
- **Compare stocks** side-by-side.
- **Maintain watchlists & alerts** with price/volume triggers.
- **Use an AI Advisor** (via n8n workflows) backed by a pgvector semantic search store.
- **Administer** the platform — market syncs, ticker discovery, invitation-based access, price history backfills — through a dedicated admin dashboard.

Access is **invitation-only** with role-based scopes (`admin`, `demo`, `paid_access`, `basic_access`, `read_only`).

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                      Nginx                           │
│       (reverse proxy — port 80/443)                  │
│   /        → Frontend (Vite dev / static prod)       │
│   /api/*   → Backend (FastAPI :8000)                 │
│   /n8n/*   → n8n  (workflow engine :5678)            │
└──────────────────────────────────────────────────────┘
        │                  │                │
   ┌────▼────┐      ┌──────▼──────┐   ┌────▼────┐
   │ Frontend │      │   Backend   │   │   n8n   │
   │ React 18 │      │   FastAPI   │   │ Workflow│
   │ Vite     │      │   Python    │   │ Engine  │
   └────┬─────┘      └──────┬──────┘   └────┬────┘
        │                   │                │
        │            ┌──────▼──────┐         │
        └───────────▶│ PostgreSQL  │◀────────┘
                     │ + pgvector  │
                     └─────────────┘
```

### Data Flow Summary

| Direction | Description |
|-----------|-------------|
| **User → Frontend** | SPA interaction (React Router, Zustand state, i18n) |
| **Frontend → Backend** | REST via `apiClient.ts` (Axios + JWT Bearer) |
| **Backend → DB** | SQLAlchemy 2.0 ORM + Alembic migrations |
| **Backend → yfinance** | Lazy-load & batch-update stock / financial data |
| **Backend → n8n** | Proxy endpoint for AI Advisor workflow |
| **n8n → DB** | Direct PostgreSQL access for vector store operations |

---

## 3. Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | **FastAPI 0.128** (Uvicorn ASGI) |
| Language | **Python 3.x** |
| ORM | **SQLAlchemy 2.0** (sync, `psycopg2-binary`) |
| Migrations | **Alembic** |
| Validation | **Pydantic v2** + `pydantic-settings` |
| Auth | **JWT** via `python-jose`, `bcrypt` for hashing |
| Market data | **yfinance** (lazy-load & admin batch) |
| Analysis | **pandas**, **numpy**, **scipy**, **numpy-financial** |
| Config | `pydantic-settings` → `.env` files |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | **React 18** + **TypeScript** |
| Bundler | **Vite 6** |
| Styling | **TailwindCSS 3** + `tailwind-merge` |
| Components | **Shadcn/UI** + **Radix UI** primitives |
| MUI usage | MUI `ThemeProvider`/`CssBaseline` for base theme + `material-react-table`; **avoid adding new MUI components** — prefer Shadcn/Radix |
| State | **Zustand** (slices: `portfolio`, `watchlist`, `alerts`, `analytics`, `baskets`, `fxRates`, `fibonacciElliott`, `portfolioPerformance`) |
| Server state | **TanStack React Query** |
| HTTP | **Axios** (`apiClient.ts` with auto Bearer token & refresh) |
| Routing | **React Router v6** |
| i18n | **i18next** + `react-i18next` (EN/PL) |
| Charts | **Recharts** + **ECharts** (`echarts-for-react`) |
| Animations | **Framer Motion** |
| Forms | **React Hook Form** + **Zod** |
| Auth | Firebase SDK (local JWT issued by backend) |

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Database | **PostgreSQL 15** (`pgvector/pgvector:pg15` image) with **pgvector** extension |
| Reverse proxy | **Nginx** (Alpine) |
| Automation | **n8n** (AI advisor, webhook workflows) |
| Containers | **Docker Compose** (separate `dev` / `prod` / `testing` configs) |
| Production domain | `tomektest.byst.re` |

---

## 4. Directory Structure

```
stock-scout/
├── backend/
│   ├── main.py                  # FastAPI app + router registration
│   ├── core/
│   │   └── config.py            # pydantic-settings (Settings)
│   ├── api/                     # Route modules (40+ files)
│   │   ├── auth.py              # Login / register / token refresh
│   │   ├── portfolio_management.py
│   │   ├── stock_details.py
│   │   ├── watchlist.py
│   │   ├── alerts.py
│   │   ├── ai_advisor.py        # n8n proxy
│   │   ├── admin.py             # Admin + invitations
│   │   ├── golden_cross.py      # Technical analysis scans
│   │   ├── death_cross.py
│   │   ├── choch.py
│   │   ├── wyckoff.py
│   │   ├── fibonacci_elliott.py
│   │   ├── breakout.py
│   │   ├── ev_to_revenue.py
│   │   ├── break_even_point.py
│   │   ├── fundamentals.py
│   │   ├── compare.py
│   │   ├── baskets.py
│   │   └── ...                  # accounts, transactions, valuations, fx, etc.
│   ├── services/                # Business logic (26+ modules, sub-dirs)
│   │   ├── portfolio_metrics_service.py
│   │   ├── portfolio_positions_service.py
│   │   ├── fundamentals/
│   │   ├── technical_analysis/
│   │   ├── valuation/
│   │   ├── fx/
│   │   ├── yfinance_data_update/
│   │   └── ...
│   ├── database/                # SQLAlchemy models
│   │   ├── base.py              # Engine + Base
│   │   ├── company.py           # Company, CompanyOverview, CompanyESGData
│   │   ├── financials.py        # Financials, FinancialHistory, Estimates, Recommendations
│   │   ├── portfolio.py         # Portfolio, Transaction, FavoriteStock
│   │   ├── stock_data.py        # StockPriceHistory, CompanyMarketData
│   │   ├── valuation.py         # PortfolioValuationDaily, PortfolioReturns
│   │   ├── user.py              # User model
│   │   ├── baskets.py           # Basket, BasketCompany, BasketType
│   │   ├── alert.py             # Alert model
│   │   └── ...
│   ├── schemas/                 # Pydantic request/response models
│   ├── utils/                   # Helpers (risk, valuation, insights, sanitize, etc.)
│   ├── alembic/                 # DB migrations
│   ├── scripts/                 # One-off maintenance scripts
│   ├── requirements.txt
│   ├── Dockerfile.dev
│   └── Dockerfile.prod
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Route definitions
│   │   ├── main.tsx             # Entry point (BrowserRouter, AuthProvider, QueryClient)
│   │   ├── theme.ts             # MUI theme
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── private-route.tsx
│   │   │   ├── shared/          # Reusable UI pieces
│   │   │   └── ui/              # Shadcn components (22 files)
│   │   ├── features/            # Feature-based modules
│   │   │   ├── admin/
│   │   │   ├── portfolio-management/
│   │   │   ├── stock-one-pager/
│   │   │   ├── scenario-carousel/   # Technical scans
│   │   │   ├── company-search/
│   │   │   ├── comapre-stocks-page/
│   │   │   ├── sign-in-form/
│   │   │   └── hero-section/
│   │   ├── services/
│   │   │   ├── apiClient.ts     # Axios instance + interceptors
│   │   │   ├── AuthProvider.tsx
│   │   │   └── api/             # Service-specific API helpers
│   │   ├── store/               # Zustand slices
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── i18n.ts
│   │   └── types.ts
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── Dockerfile.dev
│   └── Dockerfile.prod
│
├── nginx/
│   ├── nginx.dev.conf           # Dev proxy (frontend HMR + API + n8n)
│   └── nginx.prod.conf          # Prod config (static frontend + API + n8n)
│
├── n8n_templates/               # Exportable n8n workflow JSONs
├── scripts/                     # Root-level maintenance scripts
├── docs/                        # Technical documentation
│   ├── BACKEND_DATA_FLOW.md
│   ├── BASKETS.md
│   ├── CHoCH_Analysis.md
│   └── financial_data_notes.md
│
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── docker-compose.testing.yml
├── .env                         # Environment variables
├── .cursorrules                 # AI coding assistant rules
├── INVITATION_SYSTEM.md
├── SECURITY_UPDATE.md
└── README.md
```

---

## 5. Database Schema (Key Models)

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Credentials, scope, invitation reference |
| `Company` | `companies` | Ticker, ISIN, sector, market reference |
| `CompanyOverview` | `company_overview` | Long description, HQ, employees, website |
| `CompanyFinancials` | `company_financials` | Latest financial snapshot (PE, market cap…) |
| `CompanyFinancialHistory` | `company_financial_history` | Annual/quarterly statements |
| `CompanyEstimateHistory` | `company_estimate_history` | Analyst estimates |
| `CompanyRecommendationHistory` | `company_recommendation_history` | Buy/sell/hold trends |
| `CompanyMarketData` | `company_market_data` | Current market info (populated by admin update) |
| `CompanyESGData` | `company_esg_data` | ESG scores |
| `StockPriceHistory` | `stock_price_history` | Daily OHLCV candles |
| `Market` | `markets` | Exchange metadata (MIC codes) |
| `StockIndex` | `stock_indexes` | Index associations |
| `Portfolio` | `portfolios` | User portfolios (multi-currency) |
| `Account` | `accounts` | Sub-accounts within a portfolio |
| `Transaction` | `transactions` | Buy/sell/deposit/withdrawal/dividend/fee/tax/transfers |
| `PortfolioValuationDaily` | `portfolio_valuation_daily` | Materialized daily NAV snapshots |
| `PortfolioReturns` | `portfolio_returns` | Time-weighted return calculations |
| `FavoriteStock` | `favorite_stocks` | Watchlist items |
| `Basket` / `BasketCompany` | `baskets` / `basket_companies` | Smart (rule-based) & static baskets |
| `Alert` | `alerts` | Price/volume alert triggers |
| `FxRate` | `fx_rates` | Currency exchange rates |
| `Job` | `jobs` | Background job tracking |
| `RevokedToken` | `revoked_tokens` | JWT blacklist |
| `AnalysisResult` | `analysis_results` | Cached scan results |

**Migrations** are managed with **Alembic** (`backend/alembic/`). Always create a migration when modifying models:

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 6. API Route Map

All routes are prefixed with `/api/` and registered in `backend/main.py`.

| Prefix | Tag | Module | Key Operations |
|--------|-----|--------|----------------|
| `/api/auth` | Authentication | `auth.py` | Register (with invitation), login, refresh, logout |
| `/api/accounts` | Accounts | `accounts.py` | CRUD for brokerage accounts |
| `/api/portfolio-management` | Portfolio | `portfolio_management.py` | Holdings, buy/sell, combined view |
| `/api/portfolio-metrics` | Portfolio | `portfolio_metrics.py` | TTWR, breakdown, summary |
| `/api/portfolio` | Portfolio | `portfolio_dashboard.py`, `portfolio_transactions.py` | Dashboard, tx list |
| `/api/positions` | Positions | `positions_read.py` | Current positions read |
| `/api/transactions` | Transactions | `transactions.py` | Transaction CRUD |
| `/api/transfer` | Transfers | `transactions_transfer.py` | Stock transfers between accounts |
| `/api/transfer-cash` | Transfers | `transactions_transfer_cash.py` | Cash transfers |
| `/api/snapshot` | Snapshots | `account_snapshot.py` | Account snapshot operations |
| `/api/companies` | Company Search | `company_search.py` | Search/filter companies |
| `/api/company-notes` | Company Notes | `company_notes.py` | Per-user notes on tickers |
| `/api/stock-details` | Stock Data | `stock_details.py` | One-pager data (triggers lazy-load) |
| `/api/stocks-ohlc` | Stock Data | `stocks_price_data.py` | OHLC price data |
| `/api/fundamentals` | Analysis | `fundamentals.py` | Financial statements & comparables |
| `/api/technical-analysis` | Analysis | `golden_cross.py`, `death_cross.py`, `choch.py`, `breakout.py`, `wyckoff.py`, `ev_to_revenue.py`, `break_even_point.py` | Various scans |
| `/api/fibo-waves` | Fibonacci & Elliott | `fibonacci_elliott.py` | Fibonacci retracement + Elliott wave |
| `/api/compare` | Comparison | `compare.py` | Side-by-side stock comparison |
| `/api/fx-rate` | FX Rates | `fx.py` | Currency conversion |
| `/api/valuation` | Valuation | `valuation_preview.py`, `valuation_materialize.py`, `valuation_series.py` | Daily NAV, materialization |
| `/api/baskets` | Baskets | `baskets.py` | Smart/static basket management |
| `/api/watchlist` | Watchlist | `watchlist.py` | Favorites / watchlist |
| `/api/alerts` | Alerts | `alerts.py` | Price/volume alert CRUD |
| `/api/ai-advisor` | AI Advisor | `ai_advisor.py` | n8n proxy for AI workflow |
| `/api/admin` | Admin | `admin.py`, `admin_price_data.py` | Market sync, invitations, basket financials/price refresh |
| `/api/n8n` | Data Refresh | `data_refresh.py` | Consolidated price & fundamental refresh (admin + n8n) |
| `/api/jobs` | Jobs | `jobs.py` | Background job status polling |

---

## 7. Frontend Routes

Defined in `frontend/src/App.tsx`. All routes except `/signin` are wrapped in `<PrivateRoute>`.

| Path | Component | Description |
|------|-----------|-------------|
| `/signin` | `SignIn` | Login form |
| `/` | `Home` | Landing / hero + scenario carousel |
| `/portfolio-management` | `PortfolioManagement` | Portfolio overview (holdings, performance, transactions) |
| `/scenarios/golden-cross` | `GoldenCrossPage` | Golden cross scan |
| `/scenarios/death-cross` | `DeathCrossPage` | Death cross scan |
| `/scenarios/ev-to-revenue` | `EvToRevenuePage` | EV/Revenue scan |
| `/scenarios/break-even-point` | `BreakEvenPointPage` | Break-even analysis |
| `/scenarios/choch` | `ChochScanPage` | Change of Character scan |
| `/scenarios/consolidation` | `ConsolidationPage` | Consolidation/breakout scan |
| `/scenarios/wyckoff` | `WyckoffScanPage` | Wyckoff scan |
| `/scenarios/fibonacci-elliott` | `FibonacciElliottScanPage` | Fibo-Elliott scan list |
| `/scenarios/fibonacci-elliott/:ticker` | `FiboWaveScenario` | Per-ticker Fibo detail |
| `/stock-details/:ticker` | `StockOnePager` | Stock deep-dive page |
| `/compare/:tickerA/:tickerB` | `StockCompare` | Side-by-side comparison |
| `/admin` | `AdminDashboard` | Admin home |
| `/admin/create-tickers` | `AdminCreateTickersForm` | Bulk ticker creation |
| `/admin/fx-batch` | `AdminFxBatchForm` | FX rate batch import |
| `/admin/sync-markets` | `AdminSyncMarkets` | Market data sync |
| `/admin/valuation` | `AdminValuationTools` | Portfolio valuation tools |
| `/admin/yfinance-probe` | `AdminYFinanceProbe` | Raw yfinance data probe |
| `/admin/data-refresh` | `AdminDataRefresh` | Consolidated data refresh (prices + fundamentals) |
| `/admin/invitations` | `InvitationManager` | Invitation code management |

---

## 8. Environment & Configuration

### Environment Variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` / `DB_NAME` | PostgreSQL connection |
| `SECRET_KEY` | JWT signing key |
| `FMP_API_KEY` | Financial Modeling Prep API key |
| `N8N_ENCRYPTION_KEY` | n8n internal encryption |
| `VITE_API_URL` | Frontend API base URL |

### Backend Config (`backend/core/config.py`)

```python
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://localhost"]
    ENV: str = "development"
```

- **Swagger docs** are disabled in production (`ENV == "production"`).
- CORS origins should be updated when deploying to new domains.

---

## 9. Development Workflow

### Prerequisites

- Docker & Docker Compose
- Node.js (for local frontend dev outside Docker)
- Python 3.x + virtualenv (for local backend dev outside Docker)

### Start Development Stack

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts: `dev_db` (PG+pgvector), `backend` (hot-reload), `frontend` (Vite HMR), `nginx`, `n8n`.

| Service | Direct Port | Via Nginx |
|---------|------------|-----------|
| Frontend | `localhost:5173` | `localhost/` |
| Backend API | `localhost:8000` | `localhost/api/` |
| n8n | `localhost:5678` | `localhost/n8n/` |
| PostgreSQL | `localhost:5432` | — |

### Run Backend Locally (Without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Run Frontend Locally (Without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Production Deployment

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Production uses `Dockerfile.prod` for both backend and frontend. The frontend is built (`vite build`) and served as static files through Nginx.

---

## 10. Data Ingestion Strategy

The system uses a **Lazy Loading + Admin Batch + n8n Automation** strategy (see `docs/BACKEND_DATA_FLOW.md`):

1. **Lazy Load** — When a user visits `/stock-details/:ticker`, the backend checks data freshness and fetches from yfinance if stale (>350 days for annual, >80 days for quarterly).
2. **Admin Data Refresh** — Consolidated page at `/admin/data-refresh` with:
   - **Refresh All Companies** — price or fundamental data for all markets (`POST /n8n/admin-daily-prices`, `POST /n8n/admin-daily-fundamentals`).
   - **Refresh by Basket** — target specific baskets (`POST /admin/populate-price-history`, `POST /admin/run-financials-baskets`).
3. **n8n Daily Automation** — `POST /n8n/n8n-daily-prices` and `POST /n8n/n8n-daily-fundamentals` (internal token auth).
4. **Scan-triggered refresh** — Technical scans (Golden Cross, Break-Even) refresh price/financial data as needed before computing results.

**Key conventions** (see `.agent/rules/background-jobs.md`):
- All heavy jobs run in **dedicated threads** via `start_job_in_thread()` (never `BackgroundTasks`).
- **Duplicate job prevention** — endpoints check for existing PENDING/RUNNING jobs before creating new ones.
- **Stale job cleanup** — jobs stuck >2 hours are auto-marked as FAILED.
- **Smart skip logic** — `CompanyFinancials.last_updated` is stamped for all checked companies (including those confirmed fresh), preventing redundant re-evaluation.

---

## 11. Coding Conventions

### Backend (Python / FastAPI)

- **Functional style** — prefer plain functions over classes.
- **Type hints** on all function signatures.
- **Pydantic models** for request/response validation (not raw dicts).
- **Early returns** and guard clauses for error handling.
- **Snake_case** for files and variables (`is_active`, `has_permission`).
- **RORO** pattern (Receive an Object, Return an Object).
- **`async def`** for I/O-bound operations.
- **Dependency injection** via FastAPI's `Depends()`.
- File layout: route → service → database model → schema.

### Frontend (React / TypeScript)

- **Functional components** only (`const Component = () => {}`).
- **TailwindCSS** for all styling — no inline CSS or `<style>` tags.
- **Shadcn/Radix** for UI primitives — **avoid adding new MUI components**.
- **`handle` prefix** for event handlers (`handleClick`, `handleSubmit`).
- **Early returns** for readability.
- **Zustand** for client state, **React Query** for server state.
- **Accessibility** — `tabIndex`, `aria-label`, keyboard handlers on interactive elements.
- **Feature-based folder structure** under `src/features/`.
- **i18n** — all user-facing strings go through `t()` function (EN + PL). See **Internationalization** section below.

### Internationalization (i18n)

The app uses **react-i18next** with two supported languages: **English** (default) and **Polish**.

| Item | Path |
|------|------|
| EN translations | `frontend/public/locales/en/translation.json` |
| PL translations | `frontend/public/locales/pl/translation.json` |

**Conventions:**

- **Never hardcode user-facing text** — always use `t("key")` or `t("key", { defaultValue: "Fallback" })`.
- **Nested dot-notation** keys organized by feature: `portfolio.tabs.*`, `portfolio.closed.*`, `scans.wyckoff.*`, etc.
- **Both files must stay in sync** — when adding a key to EN, always add the PL translation too.
- **Lowercase key names** in `snake_case` (e.g. `shares_sold`, `empty_description`).
- Keys that are generic across features go under `common.*` (e.g. `common.shares`, `common.loading`).

### General

- **No placeholders or TODOs** — complete all implementations.
- **DRY** — extract shared logic into `utils/`, `services/`, or `components/shared/`.
- Code is **reviewed for readability** over raw performance.

---

## 12. Testing

- **Backend:** `pytest` (no extensive test suite yet — see `SECURITY_UPDATE.md` testing checklist).
- **Frontend:** `@testing-library/react` + Jest (dependencies present, test coverage is minimal).
- **Linting:** ESLint + Prettier (frontend), Flake8 + Black (backend).

### Running Linters

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && flake8 . && black --check .
```

---

## 13. Existing Documentation

| File | Topic |
|------|-------|
| `docs/BACKEND_DATA_FLOW.md` | How financial & price data is ingested (lazy + batch) |
| `docs/BASKETS.md` | Smart (rule-based) vs static baskets system |
| `docs/CHoCH_Analysis.md` | Change of Character analysis algorithm |
| `docs/financial_data_notes.md` | Notes on yfinance field mappings |
| `INVITATION_SYSTEM.md` | Invitation-based registration & role scopes |
| `SECURITY_UPDATE.md` | Jan 2026 dependency vulnerability fixes |
| `.cursorrules` | AI assistant coding rules (frontend + backend) |

---

## 14. Security Notes

- **Invitation-only access** — no open registration.
- **JWT auth** — `python-jose` + `bcrypt`; token blacklist via `RevokedToken` table.
- **Role scopes** embedded in JWT (`admin`, `demo`, `paid_access`, `basic_access`, `read_only`).
- **CORS** restricted to allowed origins.
- **Nginx security headers** — `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`.
- **Known issue:** `ecdsa` vulnerability (transitive via `python-jose`) — consider migrating to `PyJWT` + `cryptography` (see `SECURITY_UPDATE.md`).
- **`.env` is gitignored** — secrets are excluded from version control.

---

## 15. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Sync SQLAlchemy** (not async) | Simpler model; yfinance is sync; acceptable for current scale |
| **Lazy-load market data** | Avoids hitting yfinance API limits; data fetched on-demand |
| **pgvector** for AI store | Enables semantic search without a separate vector DB |
| **n8n** for AI workflows | Low-code integration for LLM pipelines; decoupled from main backend |
| **Zustand** over Redux | Less boilerplate; slice-based architecture fits the feature structure |
| **Shadcn/Radix** over MUI | Composable, accessible primitives with Tailwind; MUI kept only for legacy table/theme |
| **i18next** (EN/PL) | Polish user base with English as default |
| **Docker Compose per env** | Clean separation of dev (hot-reload, debug) vs prod (optimized, no docs) |

---

## 16. Common Tasks Quick Reference

| Task | Command / Location |
|------|-------------------|
| Start dev stack | `docker compose -f docker-compose.dev.yml up -d` |
| Start prod stack | `docker compose -f docker-compose.prod.yml up -d --build` |
| Create migration | `cd backend && alembic revision --autogenerate -m "msg"` |
| Apply migration | `cd backend && alembic upgrade head` |
| Add new API route | Create `backend/api/new_route.py` → register in `main.py` via `include_router` |
| Add new feature | Create `frontend/src/features/feature-name/` → add route in `App.tsx` |
| Add Shadcn component | `npx shadcn-ui@latest add <component>` in `frontend/` |
| Add translation keys | Edit `frontend/public/locales/{en,pl}/translation.json` |
| Run data refresh | Admin Dashboard → "Data Refresh" or `POST /n8n/admin-daily-*` |
| Access n8n (dev) | `http://localhost:5678` or `http://localhost/n8n/` |
| View API docs (dev) | `http://localhost:8000/docs` |
