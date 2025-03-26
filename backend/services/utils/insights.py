# utils/insights.py
from datetime import datetime
from sqlalchemy.orm import Session
from database.models import CompanyFinancialHistory, CompanyFinancials
import pandas as pd


def clean_nan_dict(d: dict) -> dict:
    def is_invalid(val):
        if isinstance(val, (float, int)):
            return pd.isna(val) or val != val or val in (float("inf"), float("-inf"))
        return False

    return {
        k: (None if (v is None or is_invalid(v)) else v)
        for k, v in d.items()
    }


def build_financial_trends(db: Session, company_id: int, market_id: int) -> dict:
    records = (
        db.query(CompanyFinancialHistory)
        .filter_by(company_id=company_id, market_id=market_id)
        .order_by(CompanyFinancialHistory.quarter_end_date.desc())
        .limit(6)
        .all()
    )

    if len(records) < 2:
        return {}

    def trend_series(metric):
        trend = []
        for i in range(len(records)):
            year = records[i].quarter_end_date.year
            value = getattr(records[i], metric)
            trend.append({
                "year": year,
                "value": None if value is None or (isinstance(value, float) and (pd.isna(value) or value != value)) else value
            })
        return trend

    return {
        "revenue": trend_series("total_revenue"),
        "net_income": trend_series("net_income"),
        "ebitda": trend_series("ebitda"),
        "free_cash_flow": trend_series("free_cash_flow"),
    }


def build_investor_metrics(financials: CompanyFinancials, financial_history: dict) -> dict:
    revenue = financials.total_revenue or 0
    gross_profit = financials.gross_profit or 0
    net_income = financials.net_income or 0
    ebitda = financials.ebitda or 0
    operating_income = financials.operating_income or 0
    free_cash_flow = financials.free_cash_flow or 0
    capex = financials.capital_expenditure or 0
    recent_year = financial_history['revenue'][0]['value'] if financial_history['revenue'] else None
    previous_year = financial_history['revenue'][1]['value'] if len(financial_history['revenue']) > 1 else None
    revenue_growth = ((recent_year - previous_year) / abs(previous_year) * 100) if recent_year and previous_year else None

    gross_margin = gross_profit / revenue if revenue else None
    operating_margin = operating_income / revenue if revenue else None
    ebitda_margin = ebitda / revenue if revenue else None
    fcf_margin = free_cash_flow / revenue if revenue else None
    capex_ratio = capex / revenue if revenue else None
    rule_of_40 = (revenue_growth or 0) + (gross_margin * 100 if gross_margin else 0)

    raw = {
        "gross_margin": round(gross_margin, 4) if gross_margin is not None else None,
        "operating_margin": round(operating_margin, 4) if operating_margin is not None else None,
        "ebitda_margin": round(ebitda_margin, 4) if ebitda_margin is not None else None,
        "fcf_margin": round(fcf_margin, 4) if fcf_margin is not None else None,
        "capex_ratio": round(capex_ratio, 4) if capex_ratio is not None else None,
        "rule_of_40": round((revenue_growth or 0) + (gross_margin * 100 if gross_margin else 0), 2) if revenue_growth is not None else None,
        "growth_sustainability_index": round(net_income / capex, 2) if capex else None,
    }

    raw.update({
        "revenue_growth": round(revenue_growth, 2) if revenue_growth is not None else None,
        "net_margin": round(net_income / revenue, 4) if revenue else None,
        "operating_efficiency_ratio": round(operating_income / revenue, 4) if revenue else None,
        "cash_conversion_ratio": round(free_cash_flow / net_income, 4) if net_income else None,
    })

    return clean_nan_dict(raw)


def build_extended_technical_analysis(stock_history: list[tuple]) -> dict:
    df = pd.DataFrame(stock_history, columns=["date", "close"])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df = df.dropna()

    df["SMA_50"] = df["close"].rolling(window=50).mean()
    df["SMA_200"] = df["close"].rolling(window=200).mean()
    df["Volatility_30d"] = df["close"].rolling(window=30).std()
    df["Momentum_30d"] = df["close"].pct_change(periods=30)
    df["Momentum_90d"] = df["close"].pct_change(periods=90)

    current_price = df["close"].iloc[-1]
    high_52w = df["close"].max()
    low_52w = df["close"].min()
    range_position = (current_price - low_52w) / (high_52w - low_52w) if high_52w != low_52w else None

    golden_cross = (
        df["SMA_50"].iloc[-1] > df["SMA_200"].iloc[-1]
        and df["SMA_50"].iloc[-2] <= df["SMA_200"].iloc[-2]
    ) if len(df) >= 200 else False

    death_cross = (
        df["SMA_50"].iloc[-1] < df["SMA_200"].iloc[-1]
        and df["SMA_50"].iloc[-2] >= df["SMA_200"].iloc[-2]
    ) if len(df) >= 200 else False

    raw = {
        "momentum_30d": round(df["Momentum_30d"].iloc[-1] * 100, 2) if not pd.isna(df["Momentum_30d"].iloc[-1]) else None,
        "momentum_90d": round(df["Momentum_90d"].iloc[-1] * 100, 2) if not pd.isna(df["Momentum_90d"].iloc[-1]) else None,
        "volatility_30d": round(df["Volatility_30d"].iloc[-1], 2) if not pd.isna(df["Volatility_30d"].iloc[-1]) else None,
        "range_position_52w": round(range_position * 100, 2) if range_position is not None else None,
        "golden_cross": golden_cross,
        "death_cross": death_cross,
        "stock_prices": df[["date", "close"]].dropna().to_dict(orient="records"),
        "sma_50": df[["date", "SMA_50"]].dropna().to_dict(orient="records"),
        "sma_200": df[["date", "SMA_200"]].dropna().to_dict(orient="records"),
    }

    return clean_nan_dict(raw)
