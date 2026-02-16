"""
Alert checker endpoint for n8n cron integration.

Called periodically by n8n to evaluate active alerts against current stock prices.
Returns triggered alerts with chat_id, message, and the bot token so n8n
can send Telegram messages without needing its own token configuration.
"""

import logging
from datetime import datetime
from typing import List, Optional

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database.base import get_db
from database.alert import Alert, AlertType
from database.user import User
from core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Schemas ──────────────────────────────────────────────────────────────────

class TriggeredAlert(BaseModel):
    chat_id: str
    message: str
    alert_id: int

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
    Evaluate all active, non-triggered alerts.
    Returns the bot_token and a list of triggered alerts so n8n can
    send Telegram messages using the token from this response.
    """

    # 1. Fetch active alerts for users who have Telegram connected
    alerts = (
        db.query(Alert)
        .join(User, Alert.user_id == User.id)
        .filter(
            Alert.is_active == True,           # noqa: E712
            Alert.is_triggered == False,       # noqa: E712
            User.telegram_chat_id.isnot(None),
            User.telegram_chat_id != "",
        )
        .options(joinedload(Alert.user))
        .all()
    )

    if not alerts:
        logger.info("No active alerts to check")
        return CheckResponse(bot_token=settings.TELEGRAM_BOT_TOKEN or "", triggered=[])

    # 2. Collect unique tickers and fetch current prices
    tickers = list({a.ticker for a in alerts})
    logger.info(f"Checking {len(alerts)} alerts across {len(tickers)} tickers: {tickers}")

    prices = _fetch_current_prices(tickers)

    # 3. Evaluate each alert
    triggered: list[TriggeredAlert] = []

    for alert in alerts:
        price = prices.get(alert.ticker)
        if price is None:
            logger.warning(f"No price data for {alert.ticker}, skipping alert {alert.id}")
            continue

        is_met, msg = _evaluate_alert(alert, price)

        if is_met:
            triggered.append(TriggeredAlert(
                chat_id=alert.user.telegram_chat_id,
                message=msg,
                alert_id=alert.id,
            ))
            logger.info(f"🔔 Alert {alert.id} triggered: {msg}")

    logger.info(f"Check complete: {len(triggered)}/{len(alerts)} alerts triggered")
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
