import sys, logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import portfolio_dashboard, portfolio_metrics, portfolio_transactions, stocks_price_data, valuation_preview
from api import valuation_materialize
from api import valuation_series
from api import accounts
from api import positions_read
from api import transactions
from api import transactions_transfer
from api import transactions_transfer_cash
from api import account_snapshot
from api import valuation_debug
from api import stock_details
from api import baskets as baskets_api
from core.config import settings
from api import (
    auth,
    company_search,
    compare,
    fx,
    portfolio_management,
    golden_cross,
    choch,
    admin,
    fundamentals,
    fibonacci_elliott,
    watchlist,
    company_notes,
    breakout,
    admin_price_data,
    wyckoff,
)

from database.base import Base, engine
from core.openapi_overrides import add_bearer_auth

logging.basicConfig(
    level=logging.DEBUG,  # <-- makes root logger DEBUG
    format="[%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

# Initialize FastAPI
app = FastAPI(
    title="Stock Scout API",
    docs_url=None if settings.ENV == "production" else "/docs",
    redoc_url=None,
)
add_bearer_auth(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Create database tables (only for dev, remove for production)
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(accounts.router,                   prefix="/api/accounts",     tags=["Accounts"])
app.include_router(golden_cross.router,               prefix="/api/technical-analysis", tags=["Analysis"])
app.include_router(choch.router,                      prefix="/api/technical-analysis", tags=["Analysis"])
app.include_router(breakout.router,                   prefix="/api/technical-analysis", tags=["Analysis"])
app.include_router(wyckoff.router,                    prefix="/api/technical-analysis", tags=["Analysis"])
app.include_router(fundamentals.router,               prefix="/api/fundamentals", tags=["Analysis"])
app.include_router(compare.router,                    prefix="/api/compare",      tags=["Comparison"])
app.include_router(company_search.router,             prefix="/api/companies",    tags=["Company Search"])
app.include_router(company_notes.router,              prefix="/api/company-notes", tags=["Company Notes"])
app.include_router(fibonacci_elliott.router,          prefix="/api/fibo-waves",   tags=["Fibonacci & Elliott"])
app.include_router(fx.router,                         prefix="/api/fx-rate",              tags=["FX Rates"])
app.include_router(portfolio_management.router,       prefix="/api/portfolio-management", tags=["Portfolio"])
app.include_router(portfolio_metrics.router,          prefix="/api/portfolio-metrics", tags=["Portfolio"])
app.include_router(portfolio_transactions.router,     prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(portfolio_dashboard.router,     prefix="/api/portfolio", tags=["Portfolio"],)
app.include_router(positions_read.router,             prefix="/api/positions",     tags=["Positions"])
app.include_router(stock_details.router,              prefix="/api/stock-details", tags=["Stock Data"])
app.include_router(stocks_price_data.router,           prefix="/api/stocks-ohlc",   tags=["Stock Data"])
app.include_router(valuation_preview.router,          prefix="/api/valuation",     tags=["Valuation"])
app.include_router(valuation_materialize.router,      prefix="/api/valuation",     tags=["Valuation"])
app.include_router(valuation_series.router,           prefix="/api/valuation",     tags=["Valuation"])
app.include_router(baskets_api.router,                prefix="/api",               tags=["Baskets"])
app.include_router(transactions.router,               prefix="/api/transactions",  tags=["Transactions"])
app.include_router(transactions_transfer.router,       prefix="/api/transfer",      tags=["Transfers"])
app.include_router(transactions_transfer_cash.router,  prefix="/api/transfer-cash", tags=["Transfers"])
app.include_router(watchlist.router,                  prefix="/api/watchlist",     tags=["Watchlist"])
app.include_router(account_snapshot.router,           prefix="/api/snapshot",      tags=["Snapshots"])
app.include_router(admin.router,                      prefix="/api/admin",         tags=["Admin", "Invitations"])
app.include_router(admin_price_data.router,           prefix="/api/admin",         tags=["Admin"])
app.include_router(auth.router,                       prefix="/api/auth",          tags=["Authentication"])

@app.get("/")
async def root():
    return {"message": "Welcome to the Stock Scout API!"}
