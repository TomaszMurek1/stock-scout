from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api import (
    auth,
    company_search,
    compare,
    fx,
    portfolio_management,
    portfolio_performance,
    stocks,
    golden_cross,
    admin,
    fundamentals,
    fibonacci_elliott,
    watchlist,
)
from api.positions_read import router as positions_router
from api.accounts import router as accounts_router
from api.transactions import router as transactions_router
from api.valuation_preview import router as valuation_preview_router
from api.valuation_materialize import router as valuation_writer_router
from api.valuation_debug import router as valuation_debug_router
from database.base import Base, engine
from core.openapi_overrides import add_bearer_auth




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
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(
    golden_cross.router, prefix="/api/technical-analysis", tags=["Analysis"]
)
app.include_router(fundamentals.router, prefix="/api/fundamentals", tags=["Analysis"])
app.include_router(stocks.router, prefix="/api/stock-details", tags=["Stock Data"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin", "Invitations"])
app.include_router(watchlist.router, prefix="/api/watchlist", tags=["Watchlist"])
app.include_router(
    portfolio_management.router, prefix="/api/portfolio-management", tags=["Portfolio"]
)
app.include_router(
    portfolio_performance.router,
    prefix="/api/portfolio-performace",
    tags=["Portfolio performance"],
)
app.include_router(
    fibonacci_elliott.router, prefix="/api/fibo-waves", tags=["Fibonacci & Elliott"]
)
app.include_router(compare.router, prefix="/api/compare", tags=["Comparison"])
app.include_router(
    company_search.router, prefix="/api/companies", tags=["Company Search"]
)
app.include_router(fx.router, prefix="/api/fx-rate", tags=["FX Rates"])

app.include_router(positions_router)
app.include_router(accounts_router)
app.include_router(transactions_router)
app.include_router(valuation_preview_router)
app.include_router(valuation_writer_router)
app.include_router(valuation_debug_router)

@app.get("/")
async def root():
    return {"message": "Welcome to the Stock Scout API!"}
