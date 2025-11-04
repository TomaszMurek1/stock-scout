# /services/fx_rate_service.py
import pandas as pd
import yfinance as yf
from datetime import date, timedelta
from sqlalchemy.orm import Session
from database.fx import FxRate


def get_last_fx_rate_date(db: Session, base: str, quote: str):
    result = (
        db.query(FxRate)
        .filter_by(base_currency=base, quote_currency=quote)
        .order_by(FxRate.date.desc())
        .first()
    )
    return result.date if result else None


def fetch_and_save_fx_rate(base: str, quote: str, db: Session, force: bool = False):
    today = date.today()

    # 1. Determine what dates to fetch for the requested pair
    last_date = get_last_fx_rate_date(db, base, quote)
    if last_date is None:
        start_date = today - timedelta(days=365)
    else:
        start_date = last_date + timedelta(days=1)
    end_date = today

    if start_date > end_date:
        # All up to date
        return

    # 2. Try direct pair first
    ticker = f"{base}{quote}=X"
    fx = yf.Ticker(ticker)
    hist = fx.history(start=start_date, end=end_date + timedelta(days=1))

    if not hist.empty:
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
        return

    # 3. Try cross if not available and both are not USD
    if base != "USD" and quote != "USD":
        # Always fetch and store full missing range for both
        for comp_pair in [(base, "USD"), (quote, "USD")]:
            comp_last = get_last_fx_rate_date(db, comp_pair[0], comp_pair[1])
            if comp_last is None:
                comp_start = today - timedelta(days=365)
            else:
                comp_start = comp_last + timedelta(days=1)
            comp_end = today
            if comp_start <= comp_end:
                comp_ticker = f"{comp_pair[0]}USD=X"
                comp_fx = yf.Ticker(comp_ticker)
                comp_hist = comp_fx.history(
                    start=comp_start, end=comp_end + timedelta(days=1)
                )
                for row_date, row in comp_hist.iterrows():
                    save_fx_rate_to_db(
                        db,
                        comp_pair[0],
                        "USD",
                        row_date.date(),
                        row.get("Open"),
                        row.get("High"),
                        row.get("Low"),
                        row.get("Close"),
                    )

        db.commit()

        # Now compute cross for all overlapping days, store result as base/quote
        # (e.g., GBP/PLN)
        base_usd_hist = pd.DataFrame(
            [
                (r.date, r.close)
                for r in db.query(FxRate)
                .filter_by(base_currency=base, quote_currency="USD")
                .all()
            ],
            columns=["date", "close"],
        ).set_index("date")

        quote_usd_hist = pd.DataFrame(
            [
                (r.date, r.close)
                for r in db.query(FxRate)
                .filter_by(base_currency=quote, quote_currency="USD")
                .all()
            ],
            columns=["date", "close"],
        ).set_index("date")

        common_dates = base_usd_hist.index.intersection(quote_usd_hist.index)
        for d in common_dates:
            try:
                base_usd = base_usd_hist.loc[d, "close"]
                quote_usd = quote_usd_hist.loc[d, "close"]
                if pd.notna(base_usd) and pd.notna(quote_usd) and quote_usd != 0:
                    cross_close = base_usd / quote_usd
                else:
                    cross_close = None
            except Exception:
                cross_close = None

            save_fx_rate_to_db(
                db, base, quote, d, cross_close, cross_close, cross_close, cross_close
            )
        db.commit()
        return


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
