# Alerts & Notifications System Convention

## Rule

When **creating or modifying** any code related to alerts, notifications, or SMA monitoring, **always follow** these conventions. Full documentation is in `docs/ALERTS_AND_NOTIFICATIONS.md`.

---

## 1. Two Authentication Mechanisms

Alerts has **two separate auth patterns** — never mix them:

| Endpoint group | Auth | Used by |
|----------------|------|---------|
| `/api/alerts` (CRUD) | Bearer JWT token (`get_current_user`) | Frontend UI |
| `/api/alerts/check`, `/trigger`, `/sma-report` | `X-InternalToken` header | n8n workflows only |
| `/api/alert-preferences` | Bearer JWT token | Frontend UI |

```python
# ✅ User-facing endpoint
@router.get("")
def get_alerts(db=Depends(get_db), user=Depends(get_current_user)):

# ✅ n8n-facing endpoint
@router.post("/check")
def check_alerts(db=Depends(get_db), _=Depends(verify_internal_token)):
```

## 2. AlertType: Manual vs Auto-Generated

There are **12 AlertType enum values** in two categories:

- **Manual** (7 types): Created by users via `AddAlertModal`. Only `PRICE_ABOVE` and `PRICE_BELOW` have working backend evaluation. `PERCENT_CHANGE_UP/DOWN`, `SMA_50_ABOVE/BELOW_SMA_200`, `SMA_50_APPROACHING_SMA_200` are defined but **not implemented** in `_evaluate_alert()`.

- **Auto** (6 types): `SMA_50_CROSS_ABOVE/BELOW`, `SMA_200_CROSS_ABOVE/BELOW`, `SMA_50_DISTANCE`, `SMA_200_DISTANCE`. Created automatically by `_check_sma_alerts()` — **never create these from the frontend**.

```python
# ✅ Check if an alert is auto-generated
from database.alert import AlertType
AUTO_SMA_TYPES = {
    AlertType.SMA_50_CROSS_ABOVE, AlertType.SMA_50_CROSS_BELOW,
    AlertType.SMA_200_CROSS_ABOVE, AlertType.SMA_200_CROSS_BELOW,
    AlertType.SMA_50_DISTANCE, AlertType.SMA_200_DISTANCE,
}
```

## 3. SMA State Machine — State Transitions Only

SMA alerts use **state transition detection** stored as JSON in `user_alert_preferences.last_sma_alerts_sent`. Alerts fire **only when state changes** (e.g. price crosses from above to below SMA), not on every check.

When modifying SMA alert logic:
- Always load state from `prefs.last_sma_alerts_sent`
- Only fire when the state **changes** from previous
- Persist updated state back to `last_sma_alerts_sent` after changes
- Auto-close opposite alerts when condition reverses

```python
# ✅ Correct — state transition
if prev_side != current_side:
    state[state_key] = current_side
    # create alert...

# ❌ Wrong — fires every cycle
if price > sma50:
    # create alert...
```

## 4. Manual Alerts Are One-Shot by Design

Manual alerts (`PRICE_ABOVE`/`PRICE_BELOW`) are checked with:
```python
Alert.is_active == True AND Alert.is_triggered == False AND Alert.is_read == False
```

Once `is_triggered=True` (set by n8n via `PUT /{id}/trigger`), the alert **never fires again**. Do not change this filter without understanding the implications for notification spam.

## 5. SMA Auto-Alerts Are Created Pre-Triggered

Auto SMA alerts are inserted with `is_triggered=True` immediately in `_create_sma_alert()`. The n8n `PUT /{id}/trigger` call is optional for these — it's a no-op since they're already triggered.

## 6. Frontend Status Calculation

The frontend re-evaluates alert conditions **live** using prices from holdings/watchlist data (not just DB `is_triggered`). Priority order:

```
snoozed_until > now  →  "snoozed"
is_read = true       →  "read"
live condition met OR is_triggered = true  →  "triggered"
otherwise            →  "pending"
```

When adding new alert types, update both:
- `_evaluate_alert()` in `backend/api/alert_checker.py` (backend evaluation)
- `AlertsTab.tsx` `useEffect` switch statement (frontend live evaluation)

## Key Files

| File | Purpose |
|------|---------|
| `backend/database/alert.py` | `Alert` model + `AlertType` enum |
| `backend/database/user_alert_preferences.py` | SMA toggle preferences + state JSON |
| `backend/api/alerts.py` | CRUD endpoints (user auth) |
| `backend/api/alert_checker.py` | n8n check/trigger/sma-report endpoints |
| `backend/api/alert_preferences.py` | SMA toggle get/update endpoints |
| `backend/schemas/alert_schemas.py` | Pydantic schemas |
| `frontend/src/features/portfolio-management/types/alert.types.ts` | `AlertType` enum + interfaces |
| `frontend/src/features/portfolio-management/tabs/alerts/AlertsTab.tsx` | Main alerts table |
| `frontend/src/features/portfolio-management/modals/add-alert/AddAlertModal.tsx` | Create alert dialog |
| `frontend/src/features/portfolio-management/tabs/alerts/parts/SmaMonitoring.tsx` | SMA toggle UI |
| `frontend/src/features/portfolio-management/tabs/alerts/parts/TelegramConnect.tsx` | Telegram pairing UI |
