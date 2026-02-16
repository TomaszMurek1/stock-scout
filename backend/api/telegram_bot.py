"""
Telegram Bot integration for Stock Scout alerts.

Handles:
- Deep link pairing (user clicks link → bot receives /start TOKEN → maps to user)
- Background polling of Telegram updates (no public webhook needed)
- Status/disconnect endpoints
"""

import uuid
import time
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.base import get_db, SessionLocal
from database.user import User
from services.auth.auth import get_current_user
from core.config import settings

logger = logging.getLogger(__name__)

# ── In-memory pairing token store (token → { user_id, created_at }) ──────────
# Tokens expire after 10 minutes.  For a single-instance app this is fine;
# if you ever scale horizontally, swap for Redis.
_pairing_tokens: dict[str, dict] = {}
_TOKEN_TTL_SECONDS = 600  # 10 min

# Track the last processed Telegram update id for polling
_last_update_id = 0


def _cleanup_expired_tokens():
    """Remove tokens older than TTL."""
    now = time.time()
    expired = [t for t, v in _pairing_tokens.items() if now - v["created_at"] > _TOKEN_TTL_SECONDS]
    for t in expired:
        _pairing_tokens.pop(t, None)


def _get_bot_username() -> str:
    """Fetch the bot's username from Telegram API (cached after first call)."""
    if not hasattr(_get_bot_username, "_cached"):
        if not settings.TELEGRAM_BOT_TOKEN:
            return "YourBotName"
        try:
            resp = httpx.get(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe",
                timeout=5,
            )
            data = resp.json()
            _get_bot_username._cached = data.get("result", {}).get("username", "YourBotName")
        except Exception:
            return "YourBotName"
    return _get_bot_username._cached


# ── Background Polling ──────────────────────────────────────────────────────

async def _poll_telegram_updates():
    """
    Long-poll Telegram's getUpdates API to receive /start messages.
    This runs as a background task so no public webhook is needed.
    """
    global _last_update_id

    if not settings.TELEGRAM_BOT_TOKEN:
        logger.info("Telegram bot token not set — polling disabled")
        return

    logger.info("🤖 Starting Telegram polling loop...")
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUpdates"

    async with httpx.AsyncClient(timeout=httpx.Timeout(35.0)) as client:
        while True:
            try:
                params = {"offset": _last_update_id + 1, "timeout": 25, "allowed_updates": '["message"]'}
                resp = await client.get(url, params=params)
                data = resp.json()

                if not data.get("ok"):
                    logger.error(f"Telegram getUpdates error: {data}")
                    await asyncio.sleep(5)
                    continue

                for update in data.get("result", []):
                    _last_update_id = update["update_id"]
                    await _handle_update(update)

            except asyncio.CancelledError:
                logger.info("Telegram polling stopped")
                return
            except Exception as e:
                logger.error(f"Telegram polling error: {e}")
                await asyncio.sleep(5)


async def _handle_update(update: dict):
    """Process a single Telegram update — handle /start TOKEN pairing."""
    message = update.get("message", {})
    text = message.get("text", "")
    chat = message.get("chat", {})
    chat_id = str(chat.get("id", ""))
    first_name = chat.get("first_name", "User")

    if not text.startswith("/start ") or not chat_id:
        return

    token = text.replace("/start ", "").strip()
    logger.info(f"📨 Received /start with token: {token} from chat_id: {chat_id}")

    _cleanup_expired_tokens()
    pairing = _pairing_tokens.pop(token, None)

    if not pairing:
        await _send_telegram_message(
            chat_id,
            "❌ Link expired or invalid. Please generate a new link in Stock Scout.",
        )
        return

    user_id = pairing["user_id"]

    # Use a fresh DB session for the background task
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            logger.error(f"Pairing token mapped to non-existent user {user_id}")
            return

        db_user.telegram_chat_id = chat_id
        db.commit()
        logger.info(f"✅ User {user_id} paired with Telegram chat_id {chat_id}")
    finally:
        db.close()

    await _send_telegram_message(
        chat_id,
        f"✅ Connected! Hi {first_name}, you'll now receive Stock Scout alerts here. 🚀",
    )


# ── Lifespan (starts polling on app startup) ────────────────────────────────

_polling_task: Optional[asyncio.Task] = None

@asynccontextmanager
async def telegram_lifespan(app):
    """Start the Telegram polling background task."""
    global _polling_task
    if settings.TELEGRAM_BOT_TOKEN:
        _polling_task = asyncio.create_task(_poll_telegram_updates())
        logger.info("🤖 Telegram polling task created")
    yield
    if _polling_task:
        _polling_task.cancel()
        try:
            await _polling_task
        except asyncio.CancelledError:
            pass
        logger.info("🤖 Telegram polling task stopped")


# ── Schemas ──────────────────────────────────────────────────────────────────

class LinkTokenResponse(BaseModel):
    url: str
    token: str

class TelegramStatusResponse(BaseModel):
    connected: bool
    chat_id: Optional[str] = None


# ── Router ───────────────────────────────────────────────────────────────────

router = APIRouter()


@router.get("/link-token", response_model=LinkTokenResponse)
def get_link_token(user=Depends(get_current_user)):
    """Generate a one-time deep link for Telegram pairing."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    _cleanup_expired_tokens()

    token = uuid.uuid4().hex[:16]
    _pairing_tokens[token] = {"user_id": user.id, "created_at": time.time()}

    bot_username = _get_bot_username()
    url = f"https://t.me/{bot_username}?start={token}"

    logger.info(f"🔗 Generated pairing token for user {user.id}: {token}")
    return LinkTokenResponse(url=url, token=token)


@router.get("/status", response_model=TelegramStatusResponse)
def get_telegram_status(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if the current user has linked their Telegram."""
    db_user = db.query(User).filter(User.id == user.id).first()
    connected = bool(db_user and db_user.telegram_chat_id)
    return TelegramStatusResponse(
        connected=connected,
        chat_id=db_user.telegram_chat_id if connected else None,
    )


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_telegram(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove Telegram link from the current user."""
    db_user = db.query(User).filter(User.id == user.id).first()
    if db_user:
        db_user.telegram_chat_id = None
        db.commit()
        logger.info(f"🔌 User {user.id} disconnected Telegram")
    return None


# ── Helper ───────────────────────────────────────────────────────────────────

async def _send_telegram_message(chat_id: str, text: str):
    """Send a message via the Telegram Bot API."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("Cannot send Telegram message — bot token not configured")
        return

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
            if resp.status_code != 200:
                logger.error(f"Telegram sendMessage failed: {resp.text}")
        except Exception as e:
            logger.error(f"Telegram sendMessage error: {e}")
