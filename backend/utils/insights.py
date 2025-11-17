# utils/insights.py
from sqlalchemy.orm import Session
from database.financials import CompanyFinancialHistory, CompanyFinancials
import pandas as pd


def clean_nan_dict(d: dict) -> dict:
    def is_invalid(val):
        if isinstance(val, (float, int)):
            return pd.isna(val) or val != val or val in (float("inf"), float("-inf"))
        return False

    return {k: (None if (v is None or is_invalid(v)) else v) for k, v in d.items()}


def build_financial_trends(db: Session, company_id: int) -> dict:
    records = (
        db.query(CompanyFinancialHistory)
        .filter_by(company_id=company_id)
        .order_by(CompanyFinancialHistory.report_end_date.desc())
        .limit(6)
        .all()
    )

    if len(records) < 2:
        return {}

    def trend_series(primary_metric, fallback_metric=None):
        trend = []
        for r in records:
            year = r.report_end_date.year
            value = getattr(r, primary_metric, None)
            if (
                value is None
                or (isinstance(value, float) and (pd.isna(value) or value != value))
            ) and fallback_metric:
                value = getattr(r, fallback_metric, None)

            trend.append(
                {
                    "year": year,
                    "value": (
                        None
                        if value is None
                        or (
                            isinstance(value, float)
                            and (pd.isna(value) or value != value)
                        )
                        else value
                    ),
                }
            )
        return trend

    return {
        "revenue": trend_series("total_revenue"),
        "net_income": trend_series("net_income"),
        "ebitda": trend_series("ebitda"),
        "free_cash_flow": trend_series("free_cash_flow"),
        "eps": trend_series("diluted_eps", "basic_eps"),
    }


def build_investor_metrics(
    financials: CompanyFinancials, financial_history: dict
) -> dict:
    def safe_divide(numerator, denominator):
        if numerator is None or denominator in (0, None):
            return None
        return numerator / denominator

    def get_recent_and_previous(history_list):
        recent = history_list[0]["value"] if history_list else None
        previous = history_list[1]["value"] if len(history_list) > 1 else None
        return recent, previous

    def round_or_none(value, digits=4):
        return round(value, digits) if value is not None else None

    # Extract financial values directly
    revenue = financials.total_revenue
    gross_profit = financials.gross_profit
    net_income = financials.net_income
    ebitda = financials.ebitda
    operating_income = financials.operating_income
    free_cash_flow = financials.free_cash_flow
    capex = financials.capital_expenditure

    # Revenue growth
    recent_year, previous_year = get_recent_and_previous(
        financial_history.get("revenue", [])
    )
    revenue_growth = (
        ((recent_year - previous_year) / abs(previous_year)) * 100
        if recent_year and previous_year
        else None
    )

    # Margins and ratios
    gross_margin = safe_divide(gross_profit, revenue)
    operating_margin = safe_divide(operating_income, revenue)
    ebitda_margin = safe_divide(ebitda, revenue)
    fcf_margin = safe_divide(free_cash_flow, revenue)
    capex_ratio = safe_divide(capex, revenue)
    net_margin = safe_divide(net_income, revenue)
    operating_efficiency_ratio = safe_divide(operating_income, revenue)
    cash_conversion_ratio = safe_divide(free_cash_flow, net_income)
    growth_sustainability_index = safe_divide(net_income, capex)

    # Composite metric
    rule_of_40 = (revenue_growth or 0) + (ebitda_margin * 100 if ebitda_margin else 0)

    # Final metrics dict
    metrics = {
        "gross_margin": round_or_none(gross_margin),
        "operating_margin": round_or_none(operating_margin),
        "ebitda_margin": round_or_none(ebitda_margin),
        "fcf_margin": round_or_none(fcf_margin),
        "capex_ratio": round_or_none(capex_ratio),
        "rule_of_40": (
            round_or_none(rule_of_40, 2) if revenue_growth is not None else None
        ),
        "growth_sustainability_index": round_or_none(growth_sustainability_index, 2),
        "revenue_growth": round_or_none(revenue_growth, 2),
        "net_margin": round_or_none(net_margin),
        "operating_efficiency_ratio": round_or_none(operating_efficiency_ratio),
        "cash_conversion_ratio": round_or_none(cash_conversion_ratio),
    }

    return clean_nan_dict(metrics)


def build_extended_technical_analysis(
    stock_history: list[tuple], short_window: int = 50, long_window: int = 200
) -> dict:
    # 1) Build DataFrame
    df = pd.DataFrame(stock_history, columns=["date", "close"])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna(subset=["close"]).copy()

    # 2) Compute rolling indicators
    df["sma_short"] = df["close"].rolling(window=short_window, min_periods=1).mean()
    df["sma_long"] = df["close"].rolling(window=long_window, min_periods=1).mean()
    df["volatility_30d"] = df["close"].rolling(window=30).std()
    df["momentum_30d"] = df["close"].pct_change(periods=30)
    df["momentum_90d"] = df["close"].pct_change(periods=90)

    # 3) Summary stats
    current_price = df["close"].iloc[-1]
    high_52w = df["close"].max()
    low_52w = df["close"].min()
    range_position = (
        (current_price - low_52w) / (high_52w - low_52w)
        if high_52w != low_52w
        else None
    )

    golden_cross = False
    death_cross = False
    if len(df) >= long_window:
        golden_cross = (
            (df["sma_short"] > df["sma_long"])
            & (df["sma_short"].shift(1) <= df["sma_long"].shift(1))
        ).any()
        death_cross = (
            (df["sma_short"] < df["sma_long"])
            & (df["sma_short"].shift(1) >= df["sma_long"].shift(1))
        ).any()

    # 4) Build one per-date list
    historical = []
    for row in df.itertuples(index=False):
        historical.append(
            {
                "date": row.date.isoformat(),
                "close": round(row.close, 4),
                "sma_short": (
                    round(row.sma_short, 4) if not pd.isna(row.sma_short) else None
                ),
                "sma_long": (
                    round(row.sma_long, 4) if not pd.isna(row.sma_long) else None
                ),
            }
        )

    # 5) Package up and clean any NaNs → None
    payload = {
        "momentum_30d": (
            round(df["momentum_30d"].iloc[-1] * 100, 2)
            if not pd.isna(df["momentum_30d"].iloc[-1])
            else None
        ),
        "momentum_90d": (
            round(df["momentum_90d"].iloc[-1] * 100, 2)
            if not pd.isna(df["momentum_90d"].iloc[-1])
            else None
        ),
        "volatility_30d": (
            round(df["volatility_30d"].iloc[-1], 2)
            if not pd.isna(df["volatility_30d"].iloc[-1])
            else None
        ),
        "range_position_52w": (
            round(range_position * 100, 2) if range_position is not None else None
        ),
        "golden_cross": golden_cross,
        "death_cross": death_cross,
        "historical": historical,
    }

    return clean_nan_dict(payload)
