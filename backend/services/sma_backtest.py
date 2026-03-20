"""
SMA Distance Backtest Service

Tests the mean-reversion hypothesis:
"When a stock's price deviates ≥X% from its SMA, what happens over the next 1W/1M/3M/6M?"

Uses cached SMA columns in stock_price_history for efficient computation.
"""
import logging
from datetime import date
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Default forward-looking periods (in trading days)
DEFAULT_PERIODS = {"1W": 5, "1M": 21, "3M": 63, "6M": 126}


def load_price_series(
    db: Session,
    company_id: int,
    sma_column: str = "sma_200",
) -> Optional[pd.DataFrame]:
    """
    Load daily close prices + cached SMA from StockPriceHistory.
    Returns DataFrame with columns: [date, close, sma], sorted by date.
    Returns None if insufficient data.
    """
    rows = db.execute(text(f"""
        SELECT date, adjusted_close, {sma_column}
        FROM stock_price_history
        WHERE company_id = :cid AND {sma_column} IS NOT NULL
        ORDER BY date ASC
    """), {"cid": company_id}).fetchall()

    if not rows:
        return None

    df = pd.DataFrame(rows, columns=["date", "close", "sma"])
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    return df


def compute_sma_distance(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add pct_distance column: ((close - sma) / sma) * 100
    """
    df = df.copy()
    df["pct_distance"] = ((df["close"] - df["sma"]) / df["sma"]) * 100
    return df


def find_signals(
    df: pd.DataFrame,
    threshold_pct: float = 17.5,
    direction: str = "both",  # "above", "below", "both"
    cooldown_days: int = 21,
) -> pd.DataFrame:
    """
    Find dates where |pct_distance| >= threshold, with episode deduplication.

    Cooldown: after a signal, skip the next `cooldown_days` trading days
    before allowing another signal of the same type.

    Returns DataFrame with: [date, close, sma, pct_distance, signal_type]
    """
    signals = []
    last_above_idx = -cooldown_days - 1
    last_below_idx = -cooldown_days - 1

    for i, (dt, row) in enumerate(df.iterrows()):
        pct = row["pct_distance"]
        if pd.isna(pct):
            continue

        if pct >= threshold_pct and (direction in ("both", "above")):
            if (i - last_above_idx) > cooldown_days:
                signals.append({
                    "date": dt,
                    "close": row["close"],
                    "sma": row["sma"],
                    "pct_distance": pct,
                    "signal_type": "above",
                })
                last_above_idx = i

        elif pct <= -threshold_pct and (direction in ("both", "below")):
            if (i - last_below_idx) > cooldown_days:
                signals.append({
                    "date": dt,
                    "close": row["close"],
                    "sma": row["sma"],
                    "pct_distance": pct,
                    "signal_type": "below",
                })
                last_below_idx = i

    return pd.DataFrame(signals) if signals else pd.DataFrame()


def compute_forward_returns(
    df: pd.DataFrame,
    signal_dates: list,
    periods: Optional[dict] = None,
) -> pd.DataFrame:
    """
    For each signal date, compute the return over the next N trading days.

    Returns DataFrame: [signal_date, close_at_signal, period, forward_return_pct]
    """
    if periods is None:
        periods = DEFAULT_PERIODS

    results = []
    dates_index = df.index

    for sig_date in signal_dates:
        try:
            sig_loc = dates_index.get_loc(sig_date)
        except KeyError:
            continue

        close_at_signal = df.iloc[sig_loc]["close"]

        for period_name, trading_days in periods.items():
            future_loc = sig_loc + trading_days
            if future_loc >= len(df):
                continue  # Not enough future data

            close_future = df.iloc[future_loc]["close"]
            fwd_return = ((close_future - close_at_signal) / close_at_signal) * 100

            results.append({
                "signal_date": sig_date,
                "close_at_signal": close_at_signal,
                "period": period_name,
                "forward_return_pct": fwd_return,
            })

    return pd.DataFrame(results)


def aggregate_results(forward_returns: pd.DataFrame) -> dict:
    """
    Compute summary statistics across all signals, grouped by period.

    Returns: {
        period: {
            "count": int,
            "median_return": float,
            "mean_return": float,
            "win_rate": float,  # % of positive returns
            "p25": float,
            "p75": float,
        }
    }
    """
    if forward_returns.empty:
        return {}

    result = {}
    for period, group in forward_returns.groupby("period"):
        returns = group["forward_return_pct"]
        result[period] = {
            "count": len(returns),
            "median_return": round(float(returns.median()), 2),
            "mean_return": round(float(returns.mean()), 2),
            "win_rate": round(float((returns > 0).mean() * 100), 1),
            "p25": round(float(returns.quantile(0.25)), 2),
            "p75": round(float(returns.quantile(0.75)), 2),
        }

    return result


def run_backtest_for_company(
    db: Session,
    company_id: int,
    sma_period: int = 200,
    threshold_pct: float = 17.5,
    cooldown_days: int = 21,
    periods: Optional[dict] = None,
) -> Optional[dict]:
    """
    Run the full SMA distance backtest for a single company.

    Returns dict with signal details and forward returns, or None if insufficient data.
    """
    sma_column = f"sma_{sma_period}"
    df = load_price_series(db, company_id, sma_column)
    if df is None or len(df) < sma_period:
        return None

    df = compute_sma_distance(df)
    signals_df = find_signals(df, threshold_pct, "both", cooldown_days)

    if signals_df.empty:
        return {"company_id": company_id, "signals": 0, "results": {}}

    # Compute forward returns
    fwd = compute_forward_returns(df, signals_df["date"].tolist(), periods)

    # Split by signal type
    above_signals = signals_df[signals_df["signal_type"] == "above"]
    below_signals = signals_df[signals_df["signal_type"] == "below"]

    above_fwd = compute_forward_returns(df, above_signals["date"].tolist(), periods)
    below_fwd = compute_forward_returns(df, below_signals["date"].tolist(), periods)

    return {
        "company_id": company_id,
        "signals": len(signals_df),
        "above_signals": len(above_signals),
        "below_signals": len(below_signals),
        "above_results": aggregate_results(above_fwd),
        "below_results": aggregate_results(below_fwd),
        "all_results": aggregate_results(fwd),
        "signal_details": signals_df.to_dict("records"),
        "forward_returns": fwd.to_dict("records"),
    }
