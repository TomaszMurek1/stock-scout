from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api import (
    auth,
    favorites,
    portfolio_management,
    stocks,
    golden_cross,
    admin,
    fundamentals,
    fibonacci_elliott,
)
from database.base import Base, engine

# Initialize FastAPI
app = FastAPI(title="Stock Scout API")

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
app.include_router(favorites.router, prefix="/api/favorites", tags=["Favorites"])
app.include_router(
    portfolio_management.router, prefix="/api/portfolio-management", tags=["Portfolio"]
)
app.include_router(
    fibonacci_elliott.router,
    prefix="/api/fibonacci-elliott",
    tags=["Technical Analysis"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to the Stock Scout API!"}
