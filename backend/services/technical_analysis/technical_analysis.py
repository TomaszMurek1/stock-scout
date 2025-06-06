import logging
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session
from database.company import Company
from database.market import Market
from database.stock_data import StockPriceHistory
from services.utils.sanitize import convert_value

logger = logging.getLogger(__name__)


def find_most_recent_crossover(
    ticker: str,
    market: str,
    cross_type: str,  # "golden" or "death"
    short_window: int = 50,
    long_window: int = 200,
    min_volume: int = 0,  # In this snippet, not heavily used, but included
    adjusted: bool = True,
    start_date: datetime = None,
    end_date: datetime = None,
    max_days_since_cross: int = 30,
    db: Session = None,
):
    """
    Detect the most recent 'golden' or 'death' MA crossover for a given ticker & market.
    :param cross_type: "golden" -> short_ma crosses above long_ma
                       "death"  -> short_ma crosses below long_ma
    :return: A dict with cross info, or None if not found / out of range.
    """
    if db is None:
        logger.error("Database session 'db' must be provided.")
        return None
    if short_window >= long_window:
        logger.error("short_window must be less than long_window.")
        return None

    # 1) Fetch Market
    market_obj = db.query(Market).filter(Market.name == market).first()
    if not market_obj:
        logger.error(f"Market {market} not found.")
        return None

    # 2) Fetch Company
    company_obj = db.query(Company).filter(Company.ticker == ticker).first()
    if not company_obj:
        logger.error(f"Company with ticker={ticker} not found.")
        return None

    # 3) Verify the company is actually in the specified market
    if company_obj.market != market_obj:
        logger.error(f"Company {ticker} is not associated with market {market}.")
        return None

    # 4) Set date range if needed
    if end_date is None:
        end_date = datetime.now()
    if start_date is None:
        # Pull extra data to ensure we have enough history
        days_needed = long_window * 3
        start_date = end_date - timedelta(days=days_needed)
    if start_date >= end_date:
        logger.error("start_date must be earlier than end_date.")
        return None

    # 5) Load price data from stock_price_history
    engine = db.get_bind()
    price_col = (
        StockPriceHistory.adjusted_close if adjusted else StockPriceHistory.close
    )

    query = (
        select(StockPriceHistory.date.label("date"), price_col.label("close"))
        .where(StockPriceHistory.company_id == company_obj.company_id)
        .where(StockPriceHistory.market_id == market_obj.market_id)
        .where(StockPriceHistory.date >= start_date.date())
        .where(StockPriceHistory.date <= end_date.date())
        .order_by(StockPriceHistory.date)
    )

    df = pd.read_sql_query(query, con=engine, parse_dates=["date"])
    df.set_index("date", inplace=True)

    if len(df) < long_window:
        logger.warning(
            f"Not enough data to compute a {long_window}-day MA for {ticker}."
        )
        return None

    # 7) Calculate rolling averages
    df["short_ma"] = df["close"].rolling(window=short_window, min_periods=1).mean()
    df["long_ma"] = df["close"].rolling(window=long_window, min_periods=1).mean()

    # 8) Set up 'signal' for golden or death cross
    if cross_type == "golden":
        df["signal"] = (df["short_ma"] > df["long_ma"]).astype(int)
    elif cross_type == "death":
        df["signal"] = (df["short_ma"] < df["long_ma"]).astype(int)
    else:
        logger.error(f"Unsupported cross_type: {cross_type}")
        return None

    # 9) When 'signal' changes from 0 to 1 => positions == 1.0 => a new cross
    df["positions"] = df["signal"].diff()
    crosses = df[df["positions"] == 1.0]
    if crosses.empty:
        logger.info(f"No {cross_type} cross found for {ticker} in {market}.")
        return None

    # 10) Get the most recent cross
    most_recent_cross = crosses.iloc[-1]
    most_recent_date = crosses.index[-1]
    days_since_cross = (end_date.date() - most_recent_date.date()).days

    # If it's older than what we care about, ignore
    if max_days_since_cross and (days_since_cross > max_days_since_cross):
        logger.info(
            f"Last {cross_type} cross for {ticker} was {days_since_cross} days ago, "
            f"beyond max_days_since_cross={max_days_since_cross}."
        )
        return None

    result = {
        "ticker": ticker,
        "company_name": company_obj.name,
        "market": market_obj.name,
        "cross_type": cross_type,
        "date": most_recent_date.strftime("%Y-%m-%d"),
        "days_since_cross": int(days_since_cross),
        "close_price": float(most_recent_cross["close"]),
        "short_ma": float(most_recent_cross["short_ma"]),
        "long_ma": float(most_recent_cross["long_ma"]),
    }
    # Convert potential numpy dtypes
    result = {k: convert_value(v) for k, v in result.items()}

    logger.info(
        f"{cross_type.capitalize()} cross found for {ticker} on {most_recent_date.date()}, "
        f"{days_since_cross} day(s) ago. close={result['close_price']}"
    )
    return result
