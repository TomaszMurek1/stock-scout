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


def fetch_and_save_fx_rate(base: str, quote: str, db: Session, initial_start_date=None):
    last_date = get_last_fx_rate_date(db, base, quote)
    if last_date is None:
        start_date = initial_start_date or (date.today() - timedelta(days=365))
    else:
        start_date = last_date + timedelta(days=1)
    if start_date > date.today():
        return

    end_date = date.today()
    ticker = f"{base}{quote}=X"
    fx = yf.Ticker(ticker)
    hist = fx.history(start=start_date, end=end_date + timedelta(days=1))

    for row_date, row in hist.iterrows():
        db_fx = (
            db.query(FxRate)
            .filter_by(base_currency=base, quote_currency=quote, date=row_date.date())
            .first()
        )
        if not db_fx:
            db_fx = FxRate(
                base_currency=base,
                quote_currency=quote,
                date=row_date.date(),
                open=float(row["Open"]) if not pd.isna(row["Open"]) else None,
                high=float(row["High"]) if not pd.isna(row["High"]) else None,
                low=float(row["Low"]) if not pd.isna(row["Low"]) else None,
                close=float(row["Close"]) if not pd.isna(row["Close"]) else None,
            )
            db.add(db_fx)
    db.commit()
