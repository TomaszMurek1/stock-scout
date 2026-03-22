"""
GMMA Squeeze API endpoints.
POST /gmma-squeeze              → background scan job → poll via /jobs/{id}
GET  /gmma-squeeze/chart/{ticker} → GMMA band chart data for single ticker
POST /gmma-squeeze/report       → n8n: Telegram GMMA report per user (holdings+watchlist)
"""

import logging
from datetime import date
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.base import get_db
from database.user import User
from database.portfolio import Transaction, FavoriteStock, Portfolio
from schemas.stock_schemas import GmmaSqueezeRequest
from services.auth.auth import get_current_user
from services.gmma_scanner import run_gmma_scan, get_gmma_chart_data, run_gmma_scan_for_company_ids
from services.scan_job_service import create_job, run_scan_task
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Auth dependency for n8n internal endpoints ───────────────────────

def _verify_internal_token(x_internal_token: str = Header(...)):
    """Verify the shared secret for n8n → backend calls."""
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal token",
        )


# ── Helper: get user's holdings + watchlist company IDs ──────────────

def _get_user_company_ids(db: Session, user_id: int) -> set[int]:
    """Get all company_ids from user's holdings and watchlist."""
    company_ids = set()

    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
    if portfolio:
        holding_ids = (
            db.query(Transaction.company_id)
            .filter(
                Transaction.portfolio_id == portfolio.id,
                Transaction.company_id.isnot(None),
            )
            .distinct()
            .all()
        )
        company_ids.update(cid for (cid,) in holding_ids)

    fav_ids = (
        db.query(FavoriteStock.company_id)
        .filter(FavoriteStock.user_id == user_id)
        .all()
    )
    company_ids.update(cid for (cid,) in fav_ids)

    return company_ids


# ── Telegram report schemas ──────────────────────────────────────────

class GmmaReportMessage(BaseModel):
    chat_id: str
    text: str
    parse_mode: str = "HTML"


class GmmaReportResponse(BaseModel):
    bot_token: str
    messages: List[GmmaReportMessage]


# ── Telegram message limit ───────────────────────────────────────────
_TG_MAX_LEN = 4000


# ── Frontend scan endpoint ───────────────────────────────────────────

@router.post("/gmma-squeeze")
def scan_gmma_squeeze(
    request: GmmaSqueezeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Launch a GMMA Squeeze scan as a background job.
    Returns job_id for polling via GET /jobs/{id}.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if not request.basket_ids:
        raise HTTPException(
            status_code=400,
            detail="Select at least one basket.",
        )

    job = create_job(db, "gmma_squeeze")

    def task_wrapper(db_session: Session):
        return run_gmma_scan(
            db_session,
            basket_ids=request.basket_ids,
            min_market_cap=request.min_market_cap,
            compression_threshold=request.compression_threshold,
            starter_smoothing=request.starter_smoothing,
            session_limit=request.session_limit,
            trend_filter=request.trend_filter,
            band_width_threshold=request.band_width_threshold,
        )

    background_tasks.add_task(run_scan_task, job.id, task_wrapper)

    return {"job_id": job.id, "status": "PENDING"}


# ── Chart endpoint ───────────────────────────────────────────────────

@router.get("/gmma-squeeze/chart/{ticker}")
def gmma_chart(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return GMMA band chart data for a single ticker.
    Used by the frontend to render an inline GMMA chart.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    result = get_gmma_chart_data(db, ticker.upper())
    if not result["data"]:
        raise HTTPException(status_code=404, detail=f"No data for ticker {ticker}")

    return result


# ── n8n GMMA Squeeze Report ─────────────────────────────────────────

@router.post("/gmma-squeeze/report", response_model=GmmaReportResponse)
def gmma_squeeze_report(
    db: Session = Depends(get_db),
    _=Depends(_verify_internal_token),
):
    """
    n8n-triggered GMMA Squeeze report.

    - UPTRENDS:   scans ALL companies (entire market), min cap 50M USD
    - DOWNTRENDS: scans only user's holdings + watchlist, min cap 50M USD

    Returns Telegram-formatted messages per user.
    """
    users = (
        db.query(User)
        .filter(
            User.telegram_chat_id.isnot(None),
            User.telegram_chat_id != "",
        )
        .all()
    )

    if not users:
        return GmmaReportResponse(
            bot_token=settings.TELEGRAM_BOT_TOKEN or "", messages=[]
        )

    # ── 1. Global UP scan (all companies, run once) ──
    logger.info("GMMA report: running global UP scan (all companies)")
    global_up_result = run_gmma_scan(
        db,
        basket_ids=None,         # all companies
        min_market_cap=50,
        compression_threshold=5.0,
        trend_filter="up",
        band_width_threshold=5.0,
    )
    global_up_signals = global_up_result.get("data", [])
    logger.info(f"GMMA report: {len(global_up_signals)} global UP signals")

    # ── 2. Per-user DOWN scan (holdings + watchlist) ──
    all_messages: list[GmmaReportMessage] = []

    for user in users:
        user_company_ids = _get_user_company_ids(db, user.id)

        # DOWN signals: only from user's holdings/watchlist
        down_signals: list[dict] = []
        if user_company_ids:
            down_signals = run_gmma_scan_for_company_ids(
                db,
                company_ids=list(user_company_ids),
                compression_threshold=5.0,
                trend_filter="down",
                min_market_cap=50,
                band_width_threshold=5.0,
            )

        # Merge: global UPs + user-specific DOWNs
        combined = global_up_signals + down_signals

        if not combined:
            continue

        # Build Telegram message(s)
        # Collect user's tickers for bolding
        user_tickers = set()
        if user_company_ids:
            from database.company import Company as Co
            tickers_q = (
                db.query(Co.ticker)
                .filter(Co.company_id.in_(user_company_ids))
                .all()
            )
            user_tickers = {t[0] for t in tickers_q}

        msgs = _build_gmma_report(combined, user_tickers)
        for msg in msgs:
            all_messages.append(
                GmmaReportMessage(chat_id=user.telegram_chat_id, text=msg)
            )

    logger.info(f"GMMA report: {len(all_messages)} messages to send")
    return GmmaReportResponse(
        bot_token=settings.TELEGRAM_BOT_TOKEN or "",
        messages=all_messages,
    )


def _format_signal_line(s: dict, user_tickers: set[str]) -> str:
    """Format a single signal line — bold if ticker is owned/watchlisted."""
    ticker = s["ticker"]
    close_str = f"{s['close']:.2f}"
    starter_str = f"{s['starter_yesterday_pct']:.1f}→{s['starter_today_pct']:.1f}"

    if ticker in user_tickers:
        return f"<b>{ticker}</b> {close_str} S:{starter_str}\n"
    else:
        return f"{ticker} {close_str} S:{starter_str}\n"


def _build_gmma_report(signals: list[dict], user_tickers: set[str] | None = None) -> list[str]:
    """Build HTML-formatted Telegram messages from GMMA signals."""
    if user_tickers is None:
        user_tickers = set()

    date_str = date.today().strftime("%d %b %Y")

    header = (
        f"<b>🔬 GMMA Squeeze Report</b>\n"
        f"<i>{date_str}</i>\n"
        f"{'━' * 20}\n"
    )

    # Split by trend
    up_signals = [s for s in signals if s["trend"] == "up"]
    down_signals = [s for s in signals if s["trend"] == "down"]

    sections: list[str] = []

    if up_signals:
        section = f"\n<b>📈 Uptrend ({len(up_signals)})</b>\n"
        for s in up_signals:
            section += _format_signal_line(s, user_tickers)
        sections.append(section)

    if down_signals:
        section = f"\n<b>📉 Downtrend ({len(down_signals)})</b>\n"
        for s in down_signals:
            section += _format_signal_line(s, user_tickers)
        sections.append(section)

    # Assemble into messages, respecting Telegram limit
    messages: list[str] = []
    current = header

    for section in sections:
        if len(current) + len(section) > _TG_MAX_LEN:
            messages.append(current)
            current = f"<b>🔬 GMMA Squeeze</b> <i>(cont.)</i>\n{section}"
        else:
            current += section

    # Footer
    footer = (
        f"\n{'━' * 20}\n"
        f"<i>S = Starter% (T-1→T0)</i>\n"
        f"<i>⬛ = owned/watchlisted</i>"
    )

    if len(current) + len(footer) > _TG_MAX_LEN:
        messages.append(current)
        messages.append(footer)
    else:
        current += footer
        messages.append(current)

    return messages
