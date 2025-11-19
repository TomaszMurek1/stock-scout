# /services/fx_rate_service.py
import pandas as pd
import yfinance as yf
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.fx import FxRate


def get_last_fx_rate_date(db: Session, base: str, quote: str):
    result = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote)
        .order_by(FxRate.date.desc())
        .first()
    )
    return result.date if result else None


def get_first_fx_rate_date(db: Session, base: str, quote: str):
    result = (
        db.query(func.min(FxRate.date))
        .filter_by(base_currency=base, quote_currency=quote)
        .scalar()
    )
    return result


def fetch_and_save_fx_rate(
    base: str,
    quote: str,
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    force: bool = False,
):
    base = (base or "").upper()
    quote = (quote or "").upper()
    today = date.today()
    desired_end = min(end_date or today, today)
    desired_start = start_date or (desired_end - timedelta(days=365))

    if desired_start > desired_end:
        return

    first_date = get_first_fx_rate_date(db, base, quote)
    last_date = get_last_fx_rate_date(db, base, quote)

    ranges = []
    if first_date is None or last_date is None:
        ranges.append((desired_start, desired_end))
    else:
        if desired_start < first_date:
            ranges.append((desired_start, first_date - timedelta(days=1)))
        if desired_end > last_date:
            ranges.append((last_date + timedelta(days=1), desired_end))

    if not ranges and not force:
        return

    target_ranges = ranges or [(desired_start, desired_end)]

    for start, end in target_ranges:
        _fetch_range_for_pair(db, base, quote, start, end)


def _fetch_range_for_pair(
    db: Session, base: str, quote: str, start_date: date, end_date: date
):
    if start_date > end_date:
        return

    if _fetch_direct_range(db, base, quote, start_date, end_date):
        return

    if base != "USD" and quote != "USD":
        _fetch_cross_range(db, base, quote, start_date, end_date)


def _fetch_direct_range(
    db: Session, base: str, quote: str, start_date: date, end_date: date
):
    ticker = f"{base}{quote}=X"
    fx = yf.Ticker(ticker)
    hist = fx.history(start=start_date, end=end_date + timedelta(days=1))

    if hist.empty:
        return False

    for row_date, row in hist.iterrows():
        save_fx_rate_to_db(
            db,
            base,
            quote,
            row_date.date(),
            row.get("Open"),
            row.get("High"),
            row.get("Low"),
            row.get("Close"),
        )
    db.commit()
    return True


def _fetch_cross_range(
    db: Session, base: str, quote: str, start_date: date, end_date: date
):
    # Ensure component USD pairs are up to date for the requested range
    _fetch_direct_range(db, base, "USD", start_date, end_date)
    _fetch_direct_range(db, quote, "USD", start_date, end_date)

    base_rows = (
        db.query(FxRate.date, FxRate.close)
        .filter_by(base_currency=base, quote_currency="USD")
        .filter(FxRate.date >= start_date, FxRate.date <= end_date)
        .all()
    )
    quote_rows = (
        db.query(FxRate.date, FxRate.close)
        .filter_by(base_currency=quote, quote_currency="USD")
        .filter(FxRate.date >= start_date, FxRate.date <= end_date)
        .all()
    )

    if not base_rows or not quote_rows:
        return

    base_map = {row.date: row.close for row in base_rows}
    quote_map = {row.date: row.close for row in quote_rows}
    common_dates = sorted(set(base_map.keys()) & set(quote_map.keys()))
    if not common_dates:
        return

    for d in common_dates:
        base_usd = base_map.get(d)
        quote_usd = quote_map.get(d)
        if base_usd is None or quote_usd in (None, 0):
            continue
        try:
            cross_close = float(base_usd) / float(quote_usd)
        except Exception:
            continue

        save_fx_rate_to_db(
            db,
            base,
            quote,
            d,
            cross_close,
            cross_close,
            cross_close,
            cross_close,
        )
    db.commit()


def save_fx_rate_to_db(db, base, quote, d, o, h, low, c):
    from datetime import datetime, timezone

    db_fx = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote, date=d)
        .first()
    )
    if not db_fx:
        db_fx = FxRate(
            base_currency=base,
            quote_currency=quote,
            date=d,
            open=round4(o),
            high=round4(h),
            low=round4(low),
            close=round4(c),
            created_at=datetime.now(timezone.utc),
        )
        db.add(db_fx)


def round4(val):
    return round(float(val), 4) if val is not None and not pd.isna(val) else None
