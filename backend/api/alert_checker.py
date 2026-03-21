"""
Alert checker endpoint for n8n cron integration.

Called periodically by n8n to evaluate:
1. Manual per-ticker alerts (PRICE_ABOVE, PRICE_BELOW, etc.)
2. Automatic SMA monitoring for holdings & watchlist tickers
"""

import json
import logging
from datetime import datetime, date
from typing import List

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy import func, and_
from sqlalchemy.orm import Session, joinedload

from database.base import get_db
from database.alert import Alert, AlertType
from database.company import Company
from database.portfolio import Transaction, FavoriteStock, Portfolio
from database.stock_data import CompanyMarketData
from database.user import User
from database.user_alert_preferences import UserAlertPreferences
from services.sma_lookup_service import get_latest_smas_bulk
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class TriggeredAlert(BaseModel):
    chat_id: str
    message: str
    alert_id: int  # 0 for SMA-based alerts (no DB alert row)


class CheckResponse(BaseModel):
    bot_token: str
    triggered: List[TriggeredAlert]


# ── Auth dependency for internal endpoints ───────────────────────────────────

def verify_internal_token(x_internal_token: str = Header(...)):
    """Verify the shared secret for n8n → backend calls."""
    if x_internal_token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal token",
        )


# ── Main endpoint ───────────────────────────────────────────────────────────

@router.post("/check", response_model=CheckResponse)
def check_alerts(
    db: Session = Depends(get_db),
    _=Depends(verify_internal_token),
):
    """
    Evaluate all active alerts AND SMA-based monitoring.
    Returns the bot_token and a list of triggered alerts so n8n can
    send Telegram messages using the token from this response.
    """
    triggered: list[TriggeredAlert] = []

    # Part 1: Manual per-ticker alerts
    triggered.extend(_check_manual_alerts(db))

    # Part 2: SMA monitoring for holdings & watchlist
    triggered.extend(_check_sma_alerts(db))

    logger.info(f"Check complete: {len(triggered)} total notifications to send")
    return CheckResponse(bot_token=settings.TELEGRAM_BOT_TOKEN or "", triggered=triggered)


# ── Mark alert as triggered (called by n8n after sending Telegram msg) ───────

@router.put("/{alert_id}/trigger", status_code=status.HTTP_200_OK)
def mark_alert_triggered(
    alert_id: int,
    db: Session = Depends(get_db),
    _=Depends(verify_internal_token),
):
    """Mark a single alert as triggered (called by n8n after sending message)."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_triggered = True
    alert.last_triggered_at = datetime.utcnow()
    db.commit()

    return {"ok": True, "alert_id": alert_id}


# ── Part 1: Manual alerts ────────────────────────────────────────────────────

def _check_manual_alerts(db: Session) -> list[TriggeredAlert]:
    """Check per-ticker alerts created by users."""
    alerts = (
        db.query(Alert)
        .join(User, Alert.user_id == User.id)
        .filter(
            Alert.is_active == True,           # noqa: E712
            Alert.is_triggered == False,       # noqa: E712
            Alert.is_read == False,            # noqa: E712
            User.telegram_chat_id.isnot(None),
            User.telegram_chat_id != "",
        )
        .options(joinedload(Alert.user))
        .all()
    )

    if not alerts:
        logger.info("No active manual alerts to check")
        return []

    tickers = list({a.ticker for a in alerts})
    logger.info(f"Checking {len(alerts)} manual alerts across {len(tickers)} tickers")

    prices = _fetch_current_prices(tickers)
    triggered: list[TriggeredAlert] = []

    for alert in alerts:
        price = prices.get(alert.ticker)
        if price is None:
            continue

        is_met, msg = _evaluate_alert(alert, price)
        if is_met:
            triggered.append(TriggeredAlert(
                chat_id=alert.user.telegram_chat_id,
                message=msg,
                alert_id=alert.id,
            ))
            logger.info(f"🔔 Alert {alert.id} triggered: {msg}")

    return triggered


# ── Auto-generated SMA alert types (used for identification) ─────────────────

AUTO_SMA_TYPES = {
    AlertType.SMA_50_CROSS_ABOVE,
    AlertType.SMA_50_CROSS_BELOW,
    AlertType.SMA_200_CROSS_ABOVE,
    AlertType.SMA_200_CROSS_BELOW,
    AlertType.SMA_50_DISTANCE,
    AlertType.SMA_200_DISTANCE,
}

# Opposite types for auto-close logic
_OPPOSITE_TYPE = {
    AlertType.SMA_50_CROSS_ABOVE: AlertType.SMA_50_CROSS_BELOW,
    AlertType.SMA_50_CROSS_BELOW: AlertType.SMA_50_CROSS_ABOVE,
    AlertType.SMA_200_CROSS_ABOVE: AlertType.SMA_200_CROSS_BELOW,
    AlertType.SMA_200_CROSS_BELOW: AlertType.SMA_200_CROSS_ABOVE,
}


def _check_sma_alerts(db: Session) -> list[TriggeredAlert]:
    """
    Check SMA conditions for all users who have Telegram + prefs enabled.

    Uses STATE TRANSITION detection:
    - Tracks last-known state (above/below) per ticker+SMA in `last_sma_alerts_sent`
    - Only creates an Alert when state CHANGES (e.g. above → below)
    - Auto-closes the opposite alert when condition reverses
    """
    users_with_prefs = (
        db.query(User, UserAlertPreferences)
        .join(UserAlertPreferences, UserAlertPreferences.user_id == User.id)
        .filter(
            User.telegram_chat_id.isnot(None),
            User.telegram_chat_id != "",
        )
        .all()
    )

    if not users_with_prefs:
        return []

    triggered: list[TriggeredAlert] = []

    for user, prefs in users_with_prefs:
        # Check if any pref is enabled
        if not any([
            prefs.sma50_cross_above, prefs.sma50_cross_below,
            prefs.sma200_cross_above, prefs.sma200_cross_below,
            prefs.sma50_distance_25, prefs.sma50_distance_50,
            prefs.sma200_distance_25, prefs.sma200_distance_50,
        ]):
            continue

        company_ids = _get_user_company_ids(db, user.id)
        if not company_ids:
            continue

        market_data = _latest_market_data_rows(db, company_ids)

        # Bulk-fetch SMA values from StockPriceHistory
        sma_map = get_latest_smas_bulk(db, company_ids)

        # Load state tracker
        try:
            state = json.loads(prefs.last_sma_alerts_sent or "{}")
        except (json.JSONDecodeError, TypeError):
            state = {}

        state_changed = False

        for md, ticker, company_id in market_data:
            price = md.current_price
            sma_data = sma_map.get(company_id, {})
            sma50 = sma_data.get("sma_50")
            sma200 = sma_data.get("sma_200")

            if not price:
                continue

            # ── SMA 50 cross ─────────────────────────────────────────
            if (prefs.sma50_cross_above or prefs.sma50_cross_below) and sma50:
                current_side = "above" if price > sma50 else "below"
                state_key = f"{ticker}_sma50"
                prev_side = state.get(state_key)

                if prev_side != current_side:  # state changed (or first time)
                    state[state_key] = current_side
                    state_changed = True

                    if current_side == "below" and prefs.sma50_cross_below:
                        alert = _create_sma_alert(
                            db, user, ticker, company_id,
                            AlertType.SMA_50_CROSS_BELOW,
                            sma50,
                            f"📉 {ticker} dropped below SMA 50\nPrice: {price:.2f} | SMA 50: {sma50:.2f}",
                        )
                        if alert:
                            triggered.append(TriggeredAlert(
                                chat_id=user.telegram_chat_id,
                                message=alert.message,
                                alert_id=alert.id,
                            ))
                    elif current_side == "above" and prefs.sma50_cross_above:
                        alert = _create_sma_alert(
                            db, user, ticker, company_id,
                            AlertType.SMA_50_CROSS_ABOVE,
                            sma50,
                            f"📈 {ticker} crossed above SMA 50\nPrice: {price:.2f} | SMA 50: {sma50:.2f}",
                        )
                        if alert:
                            triggered.append(TriggeredAlert(
                                chat_id=user.telegram_chat_id,
                                message=alert.message,
                                alert_id=alert.id,
                            ))

                    # Auto-close opposite alert
                    _auto_close_opposite(db, user.id, ticker, current_side, "sma50")

            # ── SMA 200 cross ────────────────────────────────────────
            if (prefs.sma200_cross_above or prefs.sma200_cross_below) and sma200:
                current_side = "above" if price > sma200 else "below"
                state_key = f"{ticker}_sma200"
                prev_side = state.get(state_key)

                if prev_side != current_side:
                    state[state_key] = current_side
                    state_changed = True

                    if current_side == "below" and prefs.sma200_cross_below:
                        alert = _create_sma_alert(
                            db, user, ticker, company_id,
                            AlertType.SMA_200_CROSS_BELOW,
                            sma200,
                            f"📉 {ticker} dropped below SMA 200\nPrice: {price:.2f} | SMA 200: {sma200:.2f}",
                        )
                        if alert:
                            triggered.append(TriggeredAlert(
                                chat_id=user.telegram_chat_id,
                                message=alert.message,
                                alert_id=alert.id,
                            ))
                    elif current_side == "above" and prefs.sma200_cross_above:
                        alert = _create_sma_alert(
                            db, user, ticker, company_id,
                            AlertType.SMA_200_CROSS_ABOVE,
                            sma200,
                            f"📈 {ticker} crossed above SMA 200\nPrice: {price:.2f} | SMA 200: {sma200:.2f}",
                        )
                        if alert:
                            triggered.append(TriggeredAlert(
                                chat_id=user.telegram_chat_id,
                                message=alert.message,
                                alert_id=alert.id,
                            ))

                    _auto_close_opposite(db, user.id, ticker, current_side, "sma200")

            # ── SMA 50 distance ──────────────────────────────────────
            if (prefs.sma50_distance_25 or prefs.sma50_distance_50) and sma50 and sma50 > 0:
                pct = abs((price - sma50) / sma50) * 100
                new_alerts = _check_distance_transitions(
                    db, state, user, ticker, company_id,
                    price, sma50, pct, "sma50",
                    prefs.sma50_distance_25, prefs.sma50_distance_50,
                    AlertType.SMA_50_DISTANCE,
                )
                triggered.extend(new_alerts)
                if new_alerts:
                    state_changed = True

            # ── SMA 200 distance ─────────────────────────────────────
            if (prefs.sma200_distance_25 or prefs.sma200_distance_50) and sma200 and sma200 > 0:
                pct = abs((price - sma200) / sma200) * 100
                new_alerts = _check_distance_transitions(
                    db, state, user, ticker, company_id,
                    price, sma200, pct, "sma200",
                    prefs.sma200_distance_25, prefs.sma200_distance_50,
                    AlertType.SMA_200_DISTANCE,
                )
                triggered.extend(new_alerts)
                if new_alerts:
                    state_changed = True

        # Persist state if anything changed
        if state_changed:
            prefs.last_sma_alerts_sent = json.dumps(state)
            db.commit()

    logger.info(f"SMA check: {len(triggered)} notifications")
    return triggered


def _create_sma_alert(
    db: Session,
    user: User,
    ticker: str,
    company_id: int,
    alert_type: AlertType,
    threshold: float,
    message: str,
) -> Alert | None:
    """Create a real Alert row for an SMA condition. Returns the alert or None."""
    alert = Alert(
        user_id=user.id,
        company_id=company_id,
        ticker=ticker,
        alert_type=alert_type,
        threshold_value=threshold,
        is_active=True,
        is_triggered=True,
        last_triggered_at=datetime.utcnow(),
        is_read=False,
        message=message,
    )
    db.add(alert)
    db.flush()  # get the id
    logger.info(f"🔔 Auto SMA alert created: [{alert.id}] {ticker} {alert_type.value}")
    return alert


def _auto_close_opposite(
    db: Session, user_id: int, ticker: str, current_side: str, sma_label: str
):
    """Auto-close (deactivate) the opposite SMA alert when condition reverses."""
    if sma_label == "sma50":
        opposite_type = (
            AlertType.SMA_50_CROSS_ABOVE if current_side == "below"
            else AlertType.SMA_50_CROSS_BELOW
        )
    else:
        opposite_type = (
            AlertType.SMA_200_CROSS_ABOVE if current_side == "below"
            else AlertType.SMA_200_CROSS_BELOW
        )

    closed = (
        db.query(Alert)
        .filter(
            Alert.user_id == user_id,
            Alert.ticker == ticker,
            Alert.alert_type == opposite_type,
            Alert.is_active == True,  # noqa: E712
        )
        .update({"is_active": False}, synchronize_session="fetch")
    )
    if closed:
        logger.info(f"🔕 Auto-closed {closed} opposite {opposite_type.value} alert(s) for {ticker}")


def _check_distance_transitions(
    db: Session,
    state: dict,
    user: User,
    ticker: str,
    company_id: int,
    price: float,
    sma_val: float,
    pct: float,
    sma_label: str,  # "sma50" or "sma200"
    enabled_25: bool,
    enabled_50: bool,
    alert_type: AlertType,
) -> list[TriggeredAlert]:
    """Check distance threshold transitions and create alerts."""
    results: list[TriggeredAlert] = []
    direction = "above" if price > sma_val else "below"

    for threshold, enabled in [(25, enabled_25), (50, enabled_50)]:
        if not enabled:
            continue

        state_key = f"{ticker}_{threshold}pct_{sma_label}"
        now_exceeds = pct >= threshold
        prev_exceeded = state.get(state_key, False)

        if now_exceeds and not prev_exceeded:
            # Crossed INTO the threshold zone
            state[state_key] = True
            msg = (
                f"⚠️ {ticker} is {pct:.1f}% {direction} {sma_label.upper()}\n"
                f"Price: {price:.2f} | {sma_label.upper()}: {sma_val:.2f}"
            )
            alert = _create_sma_alert(
                db, user, ticker, company_id,
                alert_type, threshold, msg,
            )
            if alert:
                results.append(TriggeredAlert(
                    chat_id=user.telegram_chat_id,
                    message=alert.message,
                    alert_id=alert.id,
                ))
        elif not now_exceeds and prev_exceeded:
            # Dropped back under threshold — auto-close and reset
            state[state_key] = False
            db.query(Alert).filter(
                Alert.user_id == user.id,
                Alert.ticker == ticker,
                Alert.alert_type == alert_type,
                Alert.threshold_value == threshold,
                Alert.is_active == True,  # noqa: E712
            ).update({"is_active": False}, synchronize_session="fetch")

    return results


def _get_user_company_ids(db: Session, user_id: int) -> set[int]:
    """Get all company_ids from user's holdings and watchlist."""
    company_ids = set()

    # Holdings: distinct company_ids from BUY transactions (non-null)
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

    # Watchlist
    fav_ids = (
        db.query(FavoriteStock.company_id)
        .filter(FavoriteStock.user_id == user_id)
        .all()
    )
    company_ids.update(cid for (cid,) in fav_ids)

    return company_ids


def _latest_market_data_rows(
    db: Session,
    company_ids: set[int],
) -> list[tuple["CompanyMarketData", str, int]]:
    """
    Return one (CompanyMarketData, ticker, company_id) tuple per company_id,
    picking the row with the latest last_updated timestamp.
    Ties are broken by highest id.

    NOTE: id order does NOT equal last_updated order — rows can be inserted
    out of chronological sequence by the refresh job, so MAX(id) is unreliable.
    """
    # Subquery: latest last_updated per company_id
    latest_ts_sq = (
        db.query(
            CompanyMarketData.company_id.label("cid"),
            func.max(CompanyMarketData.last_updated).label("max_ts"),
        )
        .filter(CompanyMarketData.company_id.in_(company_ids))
        .group_by(CompanyMarketData.company_id)
        .subquery()
    )

    # Join back to get the actual row; if two rows share the same last_updated,
    # pick the one with the highest id via a secondary MAX subquery.
    best_id_sq = (
        db.query(func.max(CompanyMarketData.id).label("best_id"))
        .join(
            latest_ts_sq,
            and_(
                CompanyMarketData.company_id == latest_ts_sq.c.cid,
                CompanyMarketData.last_updated == latest_ts_sq.c.max_ts,
            ),
        )
        .group_by(CompanyMarketData.company_id)
        .subquery()
    )

    return (
        db.query(CompanyMarketData, Company.ticker, Company.company_id)
        .join(Company, CompanyMarketData.company_id == Company.company_id)
        .filter(CompanyMarketData.id.in_(best_id_sq))
        .all()
    )


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fetch_current_prices(tickers: list[str]) -> dict[str, float]:
    """Fetch current prices for a list of tickers using yfinance."""
    result = {}
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            price = t.fast_info.get("lastPrice") or t.fast_info.get("last_price")
            if price and price == price:  # not NaN
                result[ticker] = float(price)
                logger.debug(f"Price for {ticker}: {price}")
            else:
                logger.warning(f"No price from fast_info for {ticker}")
        except Exception as e:
            logger.warning(f"Could not get price for {ticker}: {e}")
    return result


def _evaluate_alert(alert: Alert, current_price: float) -> tuple[bool, str]:
    """
    Evaluate whether an alert condition is met.
    Returns (is_triggered, message_text).
    """
    ticker = alert.ticker
    threshold = alert.threshold_value

    if alert.alert_type == AlertType.PRICE_ABOVE:
        if current_price >= threshold:
            return True, (
                f"🚨 {ticker} is above {threshold:.2f}\n"
                f"📈 Current price: {current_price:.2f}"
            )

    elif alert.alert_type == AlertType.PRICE_BELOW:
        if current_price <= threshold:
            return True, (
                f"🚨 {ticker} is below {threshold:.2f}\n"
                f"📉 Current price: {current_price:.2f}"
            )

    elif alert.alert_type == AlertType.PERCENT_CHANGE_UP:
        pass

    elif alert.alert_type == AlertType.PERCENT_CHANGE_DOWN:
        pass

    elif alert.alert_type in (
        AlertType.SMA_50_ABOVE_SMA_200,
        AlertType.SMA_50_BELOW_SMA_200,
        AlertType.SMA_50_APPROACHING_SMA_200,
    ):
        pass

    return False, ""


# ── SMA Distance Report ─────────────────────────────────────────────────────

# Band definitions: (label, emoji, min_pct, max_pct)
# min is inclusive, max is exclusive (except the last open-ended band)
_SMA_BANDS = [
    # Near SMA
    ("±5%  (near SMA)",       "🎯", -5,       5),
    # Above SMA (ascending distance)
    ("5 – 10%  above SMA",    "🟢", 5.001,    10),
    ("10 – 17.5%  above SMA", "🟩", 10.001,   17.5),
    ("17.5 – 25%  above SMA", "💚", 17.5001,  25),
    ("25%+  above SMA",       "🚀", 25.001,   None),
    # Below SMA (ascending distance)
    ("5 – 10%  below SMA",    "🔴", -10,      -5.001),
    ("10 – 17.5%  below SMA", "🟥", -17.5,    -10.001),
    ("17.5 – 25%  below SMA", "❤️",  -25,      -17.5001),
    ("25%+  below SMA",       "💀", None,     -25.001),
]


def _classify_pct(pct: float) -> int | None:
    """Return the band index (0-8) for a given percentage, or None."""
    for idx, (_, _, lo, hi) in enumerate(_SMA_BANDS):
        if lo is None:
            # open-ended below: pct <= hi
            if pct <= hi:
                return idx
        elif hi is None:
            # open-ended above: pct >= lo
            if pct >= lo:
                return idx
        else:
            if lo <= pct <= hi:
                return idx
    return None


class SmaReportMessage(BaseModel):
    chat_id: str
    text: str
    parse_mode: str = "HTML"


class SmaReportResponse(BaseModel):
    bot_token: str
    messages: List[SmaReportMessage]


# Telegram message limit with a small safety margin
_TG_MAX_LEN = 4000


class _MdWithSma:
    """
    Thin adapter that injects sma_50/sma_200 from StockPriceHistory onto a
    CompanyMarketData instance so `_build_sma_report_messages` can keep using
    `getattr(md, "sma_50")` without changes.
    """
    def __init__(self, md: CompanyMarketData, sma_data: dict):
        self._md = md
        self.sma_50 = sma_data.get("sma_50")
        self.sma_200 = sma_data.get("sma_200")

    @property
    def current_price(self):
        return self._md.current_price


@router.post("/sma-report", response_model=SmaReportResponse)
def sma_distance_report(
    db: Session = Depends(get_db),
    _=Depends(verify_internal_token),
):
    """
    Generate a Telegram-formatted SMA distance report for every user
    with Telegram connected.  Groups holdings + watchlist tickers by
    their % distance from SMA 50 and SMA 200.
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
        return SmaReportResponse(bot_token=settings.TELEGRAM_BOT_TOKEN or "", messages=[])

    all_messages: list[SmaReportMessage] = []

    for user in users:
        company_ids = _get_user_company_ids(db, user.id)
        if not company_ids:
            continue

        market_data_rows = _latest_market_data_rows(db, company_ids)

        # Bulk-fetch SMA values from StockPriceHistory
        sma_map = get_latest_smas_bulk(db, company_ids)

        # Build rows as (md_with_sma, ticker) where md_with_sma is an object
        # that has current_price, sma_50, sma_200
        rows = []
        for md, ticker, cid in market_data_rows:
            sma_data = sma_map.get(cid, {})
            rows.append((_MdWithSma(md, sma_data), ticker))

        if not rows:
            continue

        chunks = _build_sma_report_messages(rows)
        for msg in chunks:
            all_messages.append(SmaReportMessage(chat_id=user.telegram_chat_id, text=msg))

    logger.info(f"SMA report: {len(all_messages)} messages to send")
    return SmaReportResponse(bot_token=settings.TELEGRAM_BOT_TOKEN or "", messages=all_messages)


def _build_sma_report_messages(
    rows: list[tuple[CompanyMarketData, str]],
) -> list[str]:
    """
    Build HTML-formatted Telegram messages for SMA 50 + SMA 200.
    Returns a list of message strings, each ≤ 4000 chars.
    """
    # Build sections (one per SMA) as lists of band blocks
    sections: list[tuple[str, list[str]]] = []  # (section_header, [band_blocks])

    for sma_label, sma_attr in [("SMA 50", "sma_50"), ("SMA 200", "sma_200")]:
        # band_index → list of (ticker, pct)
        bands: dict[int, list[tuple[str, float]]] = {}

        for md, ticker in rows:
            price = md.current_price
            sma_val = getattr(md, sma_attr)
            if not price or not sma_val or sma_val == 0:
                continue

            pct = ((price - sma_val) / sma_val) * 100
            band_idx = _classify_pct(pct)
            if band_idx is not None:
                bands.setdefault(band_idx, []).append((ticker, pct))

        if not bands:
            continue

        section_header = (
            f"{'━' * 20}\n"
            f"<b>📊  {sma_label}  Distance Report</b>\n"
            f"{'━' * 20}"
        )

        band_blocks: list[str] = []
        for idx, (label, emoji, _, _) in enumerate(_SMA_BANDS):
            entries = bands.get(idx)
            if not entries:
                continue
            # Sort alphabetically; .WA tickers grouped at the end
            entries.sort(key=lambda e: (e[0].endswith(".WA"), e[0]))

            header_line = f"\n{emoji}  <b>{label}</b>  ({len(entries)})"

            if idx == 0:
                # ±5% band: ticker names only, 2 columns
                grid = _format_two_columns_plain(entries)
            else:
                # Other bands: ticker + percentage, 2 columns
                grid = _format_two_columns_pct(entries)

            block = f"{header_line}\n<pre>{grid}</pre>"
            band_blocks.append(block)

        sections.append((section_header, band_blocks))

    if not sections:
        return []

    # Assemble into messages, splitting at _TG_MAX_LEN
    date_str = date.today().strftime("%d %b %Y")
    messages: list[str] = []

    for section_header, band_blocks in sections:
        header = (
            f"<b>📈  SMA Distance Report</b>\n"
            f"<i>{date_str}</i>\n\n"
            f"{section_header}"
        )

        current_msg = header
        for block in band_blocks:
            # Would adding this block exceed the limit?
            if len(current_msg) + len(block) + 1 > _TG_MAX_LEN:
                # Flush current message
                messages.append(current_msg)
                # Start a new continuation message
                current_msg = (
                    f"<b>📈  SMA Distance Report</b>  <i>(cont.)</i>\n"
                    f"<i>{date_str}</i>\n\n"
                    f"{section_header}"
                    f"{block}"
                )
            else:
                current_msg += block

        if current_msg:
            messages.append(current_msg)

    return messages


def _format_two_columns_plain(entries: list[tuple[str, float]]) -> str:
    """Format ticker names only (no %) in 2 columns, monospace."""
    col_width = max((len(t) for t, _ in entries), default=6) + 2
    lines: list[str] = []
    for i in range(0, len(entries), 2):
        left = entries[i][0].ljust(col_width)
        if i + 1 < len(entries):
            right = entries[i + 1][0]
        else:
            right = ""
        lines.append(f" {left}{right}")
    return "\n".join(lines)


def _format_two_columns_pct(entries: list[tuple[str, float]]) -> str:
    """Format ticker + percentage in 2 columns, monospace."""
    def _fmt(ticker: str, pct: float) -> str:
        sign = "+" if pct >= 0 else ""
        return f"{ticker} ({sign}{pct:.1f}%)"

    formatted = [_fmt(t, p) for t, p in entries]
    col_width = max((len(s) for s in formatted), default=12) + 2
    lines: list[str] = []
    for i in range(0, len(formatted), 2):
        left = formatted[i].ljust(col_width)
        if i + 1 < len(formatted):
            right = formatted[i + 1]
        else:
            right = ""
        lines.append(f" {left}{right}")
    return "\n".join(lines)

