from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from api.portfolio_crud import get_or_create_portfolio
from services.auth.auth import get_current_user
from database.base import get_db
from database.portfolio import FavoriteStock
from database.position import PortfolioPositions
from database.user import User
from database.company import Company
from database.stock_data import CompanyMarketData
from database.company_note import CompanyNote

router = APIRouter()


# ---------- Pydantic schemas ----------


class WatchlistAddRequest(BaseModel):
    """
    Request body for adding a company to watchlist.
    Supports both `ticker` and `company_symbol` for flexibility.
    """
    ticker: Optional[str] = None
    company_symbol: Optional[str] = None

    def resolved_ticker(self) -> str:
        value = self.ticker or self.company_symbol or ""
        return value.upper().strip()


# ---------- Helper functions ----------


def get_watchlist_companies_for_user(db: Session, user: User) -> List[dict]:
    """
    Minimal watchlist data (ticker + name).
    Still useful for lightweight endpoints or internal use.
    """
    watchlist = (
        db.query(FavoriteStock)
        .options(joinedload(FavoriteStock.company))
        .filter(FavoriteStock.user_id == user.id)
        .all()
    )

    return [
        {
            "ticker": item.company.ticker,
            "name": item.company.name,
        }
        for item in watchlist
    ]


def get_holdings_for_user(db: Session, user: User) -> List[dict]:
    """
    Returns a list of current holdings for the user's portfolio:

    [
      {
        "ticker": ...,
        "name": ...,
        "shares": ...,
        "average_price": ...,
        "last_price": ...,
        "currency": ...
      },
      ...
    ]
    """
    portfolio = get_or_create_portfolio(db, user.id)
    # Use all accounts for this portfolio, then positions for those accounts
    account_ids = [a.id for a in portfolio.accounts]
    if not account_ids:
        return []

    positions = (
        db.query(PortfolioPositions)
        .filter(PortfolioPositions.account_id.in_(account_ids))
        .all()
    )

    holdings: List[dict] = []
    for pos in positions:
        latest_md: Optional[CompanyMarketData] = (
            db.query(CompanyMarketData)
            .filter_by(company_id=pos.company_id)
            .order_by(CompanyMarketData.last_updated.desc())
            .first()
        )
        last_price: Optional[float] = None
        currency: Optional[str] = None

        if latest_md and latest_md.current_price is not None:
            last_price = round(float(latest_md.current_price), 2)
        if pos.instrument_currency_code:
            currency = pos.instrument_currency_code
        elif pos.company and pos.company.market and pos.company.market.currency:
            currency = pos.company.market.currency
        avg_price = None
        if pos.avg_cost_instrument_ccy is not None:
            try:
                avg_price = float(pos.avg_cost_instrument_ccy)
            except (TypeError, ValueError):
                avg_price = None
        
        holdings.append(
            {
                "ticker": pos.company.ticker,
                "name": pos.company.name,
                "shares": float(pos.quantity),
                "average_price": avg_price,
                "last_price": last_price,
                "currency": currency,
            }
        )
    return holdings


def _add_company_to_watchlist(
    db: Session,
    user: User,
    company: Company,
) -> FavoriteStock:
    """
    Shared logic for adding a company to watchlist.
    Raises HTTPException if already in watchlist.
    """
    exists = (
        db.query(FavoriteStock)
        .filter_by(user_id=user.id, company_id=company.company_id)
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already in watchlist",
        )

    fav = FavoriteStock(user_id=user.id, company_id=company.company_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def _get_latest_market_data_for_company(
    db: Session,
    company_id: int,
) -> Dict[str, Optional[object]]:
    latest_md: Optional[CompanyMarketData] = (
        db.query(CompanyMarketData)
        .filter_by(company_id=company_id)
        .order_by(CompanyMarketData.last_updated.desc())
        .first()
    )

    last_price: Optional[float] = None
    currency: Optional[str] = None
    last_updated: Optional[str] = None

    if latest_md:
        if latest_md.current_price is not None:
            last_price = round(float(latest_md.current_price), 2)
        if (
            latest_md.company
            and latest_md.company.market
            and latest_md.company.market.currency
        ):
            currency = latest_md.company.market.currency
        if latest_md.last_updated is not None:
            last_updated = latest_md.last_updated.isoformat()

    return {
        "last_price": last_price,
        "currency": currency,
        "last_updated": last_updated,
    }


def build_watchlist_full_for_user(db: Session, user: User) -> List[dict]:
    """
    Returns a rich watchlist view for the user, combining:
    - FavoriteStock
    - Company
    - CompanyNote (if exists)
    - Latest CompanyMarketData
    - Holdings info (is_held, shares, average_price)
    """
    favorites: List[FavoriteStock] = (
        db.query(FavoriteStock)
        .options(joinedload(FavoriteStock.company))
        .filter(FavoriteStock.user_id == user.id)
        .all()
    )
    if not favorites:
        return []

    company_ids = [fav.company_id for fav in favorites]

    # Notes mapping
    notes_by_company: Dict[int, CompanyNote] = {
        note.company_id: note
        for note in db.query(CompanyNote)
        .filter(CompanyNote.user_id == user.id)
        .filter(CompanyNote.company_id.in_(company_ids))
        .all()
    }

    # Holdings mapping by ticker
    holdings_list = get_holdings_for_user(db, user)
    holdings_by_ticker: Dict[str, dict] = {
        h["ticker"]: h for h in holdings_list
    }

    result: List[dict] = []

    for fav in favorites:
        company = fav.company
        ticker = company.ticker

        market_data = _get_latest_market_data_for_company(
            db, company.company_id
        )

        note = notes_by_company.get(company.company_id)
        note_summary: Optional[dict] = None
        if note:
            next_catalyst_str = None
            if note.next_catalyst and isinstance(note.next_catalyst, dict):
                next_catalyst_str = note.next_catalyst.get("event")
            elif note.next_catalyst and isinstance(note.next_catalyst, str):
                next_catalyst_str = note.next_catalyst

            note_summary = {
                "title": note.notes,
                "research_status": note.research_status,
                "sentiment_score": note.sentiment_score,
                "sentiment_trend": note.sentiment_trend,
                "thesis": note.investment_thesis,
                "risk_factors": note.risk_factors,
                "next_catalyst": next_catalyst_str,
                "target_price_low": float(note.intrinsic_value_low)
                if note.intrinsic_value_low is not None
                else None,
                "target_price_high": float(note.intrinsic_value_high)
                if note.intrinsic_value_high is not None
                else None,
                "intrinsic_value_low": float(note.intrinsic_value_low)
                if note.intrinsic_value_low is not None
                else None,
                "intrinsic_value_high": float(note.intrinsic_value_high)
                if note.intrinsic_value_high is not None
                else None,
                "margin_of_safety": float(note.margin_of_safety)
                if note.margin_of_safety is not None
                else None,
                "tags": note.tags,
                "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            }

        holding = holdings_by_ticker.get(ticker)
        is_held = holding is not None
        held_shares = holding["shares"] if holding else None
        average_price = holding["average_price"] if holding else None

        result.append(
            {
                "company_id": company.company_id,
                "ticker": ticker,
                "name": company.name,
                # Include more company meta if you have it:
                "sector": getattr(company, "sector", None),
                "industry": getattr(company, "industry", None),
                "added_at": fav.created_at.isoformat() if fav.created_at else None,
                "market_data": market_data,
                "note": note_summary,
                "is_held": is_held,
                "held_shares": held_shares,
                "average_price": average_price,
            }
        )

    return result


# ---------- Routes ----------


@router.post("", status_code=status.HTTP_201_CREATED)
def add_to_watchlist_body(
    payload: WatchlistAddRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    POST /api/watchlist
    Body: { "ticker": "AAPL" } or { "company_symbol": "AAPL" }

    Validates that the company exists and adds it to the user's watchlist.
    """
    ticker = payload.resolved_ticker()
    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ticker or company_symbol is required",
        )

    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    fav = _add_company_to_watchlist(db, user, company)
    return {
        "message": "Added to watchlist",
        "company_id": fav.company_id,
        "ticker": company.ticker,
    }



@router.get("")
def list_watchlist_full(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    GET /api/watchlist

    Returns a full watchlist view:
    [
      {
        "company_id": ...,
        "ticker": ...,
        "name": ...,
        "sector": ...,
        "industry": ...,
        "added_at": "...",
        "market_data": {
          "last_price": ...,
          "currency": ...,
          "last_updated": "..."
        },
        "note": {
          "research_status": ...,
          "sentiment_score": ...,
          "sentiment_trend": ...,
          "intrinsic_value_low": ...,
          "intrinsic_value_high": ...,
          "margin_of_safety": ...,
          "tags": [...]
        },
        "is_held": true/false,
        "held_shares": ...,
        "average_price": ...
      },
      ...
    ]
    """
    return build_watchlist_full_for_user(db, user)


@router.delete("/{ticker}")
def remove_from_favorites(
    ticker: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    DELETE /api/watchlist/{ticker}
    Removes the given ticker from the user's watchlist.
    """
    ticker_norm = ticker.upper().strip()
    company = db.query(Company).filter(Company.ticker == ticker_norm).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    fav = (
        db.query(FavoriteStock)
        .filter_by(user_id=user.id, company_id=company.company_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="Not in watchlist")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from watchlist"}
