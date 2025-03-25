# utils/insights.py
from datetime import datetime
from sqlalchemy.orm import Session
from database.models import CompanyFinancialHistory, CompanyFinancials
import pandas as pd


def clean_nan_dict(d: dict) -> dict:
    return {
        k: (None if (v is None or pd.isna(v) or isinstance(v, float) and (v != v or v in (float('inf'), float('-inf')))) else v)
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

    def yoy_change(current, previous):
        if previous in (None, 0) or current is None:
            return None
        return round((current - previous) / abs(previous) * 100, 2)

    def trend_series(metric):
        trend = []
        for i in range(len(records) - 1):
            current = getattr(records[i], metric)
            previous = getattr(records[i + 1], metric)
            change = yoy_change(current, previous)
            year = records[i].quarter_end_date.year
            trend.append({
                "year": year,
                "yoy_change": None if change is None or (isinstance(change, float) and (pd.isna(change) or change != change)) else change
            })
        return trend

    return {
        "revenue_growth_yoy": trend_series("total_revenue"),
        "net_income_growth_yoy": trend_series("net_income"),
        "ebitda_growth_yoy": trend_series("ebitda"),
        "fcf_growth_yoy": trend_series("free_cash_flow"),
    }


def build_investor_metrics(financials: CompanyFinancials) -> dict:
    revenue = financials.total_revenue or 0
    gross_profit = financials.gross_profit or 0
    net_income = financials.net_income or 0
    ebitda = financials.ebitda or 0
    operating_income = financials.operating_income or 0
    free_cash_flow = financials.free_cash_flow or 0
    capex = financials.capital_expenditure or 0
    revenue_growth = None  # calculated from history separately

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
        "rule_of_40": round(rule_of_40, 2) if gross_margin is not None else None,
        "growth_sustainability_index": round(net_income / capex, 2) if capex else None,
    }

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
    }

    return clean_nan_dict(raw)
