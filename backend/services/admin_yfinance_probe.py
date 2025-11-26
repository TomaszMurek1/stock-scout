import logging
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

import pandas as pd
import yfinance as yf

from services.fundamentals.fetch_financial_data_executor import (
    get_first_valid_row,
    get_most_recent_column,
    safe_get,
)
from utils.sanitize import convert_value, sanitize_numpy_types

logger = logging.getLogger(__name__)


def _format_column(col: Any) -> str:
    if hasattr(col, "isoformat"):
        return col.isoformat()
    if hasattr(col, "to_pydatetime"):
        try:
            return col.to_pydatetime().isoformat()
        except Exception:
            pass
    try:
        return col.strftime("%Y-%m-%d")
    except Exception:
        return str(col)


def _df_to_records(
    df: pd.DataFrame | None,
    max_rows: int | None = 60,
    max_cols: int | None = None,
    use_head: bool = False,
) -> list[dict]:
    if not isinstance(df, pd.DataFrame) or df.empty:
        return []

    trimmed = df.copy()
    if max_cols and trimmed.shape[1] > max_cols:
        trimmed = trimmed.iloc[:, -max_cols:]
    if max_rows and trimmed.shape[0] > max_rows:
        trimmed = trimmed.head(max_rows) if use_head else trimmed.tail(max_rows)

    trimmed = trimmed.reset_index()
    trimmed.columns = ["label"] + [_format_column(c) for c in trimmed.columns[1:]]

    for col in trimmed.columns:
        trimmed[col] = trimmed[col].apply(convert_value)

    return sanitize_numpy_types(trimmed.to_dict(orient="records"))


def _history_to_records(df: pd.DataFrame | None, limit: int = 10) -> list[dict]:
    if not isinstance(df, pd.DataFrame) or df.empty:
        return []
    sample = df.tail(limit).reset_index()
    sample.columns = [_format_column(c) for c in sample.columns]
    for col in sample.columns:
        sample[col] = sample[col].apply(convert_value)
    return sanitize_numpy_types(sample.to_dict(orient="records"))


def _to_plain_dict(data: Any) -> dict:
    if isinstance(data, dict):
        return sanitize_numpy_types(data)
    try:
        return sanitize_numpy_types(dict(data))
    except Exception:
        return {"raw": str(data)}


def _to_datetime(col: Any) -> datetime | None:
    if hasattr(col, "to_pydatetime"):
        try:
            return col.to_pydatetime()
        except Exception:
            return None
    try:
        return datetime.fromisoformat(str(col))
    except Exception:
        return None


def _get_column_by_offset(columns: Iterable[Any], offset: int = 0) -> Any:
    col_list = list(columns) if columns is not None else []
    if not col_list:
        return None
    sortable = []
    for col in col_list:
        sortable.append((_to_datetime(col) or datetime.min, col))
    sortable.sort(key=lambda x: x[0])
    index = len(sortable) - 1 - offset
    if index < 0 or index >= len(sortable):
        return None
    return sortable[index][1]


def _latest_value(df: pd.DataFrame | None, labels: str | list[str], offset: int = 0):
    if df is None or df.empty:
        return None
    col = _get_column_by_offset(df.columns, offset)
    if col is None:
        return None
    if isinstance(labels, (list, tuple, set)):
        return get_first_valid_row(df, list(labels), col)
    return safe_get(df, str(labels), col)


def _ratio(numerator: float | int | None, denominator: float | int | None):
    try:
        if numerator is None or denominator in (None, 0):
            return None
        return float(numerator) / float(denominator)
    except Exception:
        return None


def _extract_price_target(targets: Any) -> float | None:
    if targets is None:
        return None

    if isinstance(targets, dict):
        for key in ("targetMean", "targetMeanPrice", "mean", "priceTargetAverage"):
            if key in targets and targets[key] is not None:
                return convert_value(targets[key])
        return None

    if isinstance(targets, pd.DataFrame) and not targets.empty:
        for key in ("targetMean", "targetMeanPrice", "mean", "priceTargetAverage"):
            if key in targets.columns and not targets[key].isna().all():
                return convert_value(targets[key].iloc[0])
        for col in targets.columns:
            if "mean" in str(col).lower() and not targets[col].isna().all():
                return convert_value(targets[col].iloc[0])
    return None


def _extract_growth_value(df: pd.DataFrame | None, search_terms: list[str]) -> float | None:
    if df is None or df.empty:
        return None
    lookup_idx = {str(i).lower(): i for i in df.index}
    for term in search_terms:
        key = term.lower()
        if key in lookup_idx:
            series = df.loc[lookup_idx[key]]
            numeric_vals = [
                convert_value(v)
                for v in series.tolist()
                if isinstance(convert_value(v), (int, float))
            ]
            if numeric_vals:
                return numeric_vals[0]
    for col in df.columns:
        if "growth" in str(col).lower():
            series = df[col].dropna()
            if not series.empty:
                return convert_value(series.iloc[0])
    return None


def _compute_revision_direction(eps_revisions: pd.DataFrame | None) -> str | None:
    if eps_revisions is None or eps_revisions.empty:
        return None
    ups = 0
    downs = 0
    data = eps_revisions.to_dict()
    for key, values in data.items():
        key_lower = str(key).lower()
        for _, raw_val in values.items():
            val = convert_value(raw_val)
            if val is None:
                continue
            try:
                num = float(val)
            except Exception:
                continue
            if "up" in key_lower:
                ups += num
            elif "down" in key_lower:
                downs += num
    if ups == downs == 0:
        return None
    if abs(ups - downs) < 1e-9:
        return "neutral"
    return "upward" if ups > downs else "downward"


def compute_metrics(
    income_stmt: pd.DataFrame | None,
    balance_sheet: pd.DataFrame | None,
    cash_flow: pd.DataFrame | None,
    fast_info: dict,
    revenue_estimate: pd.DataFrame | None,
    earnings_estimate: pd.DataFrame | None,
    growth_estimates: pd.DataFrame | None,
    eps_revisions: pd.DataFrame | None,
    analyst_targets: Any,
) -> dict:
    def first_nonempty_df(*dfs: pd.DataFrame | None) -> pd.DataFrame | None:
        for df in dfs:
            if isinstance(df, pd.DataFrame) and not df.empty:
                return df
        return None

    total_revenue = _latest_value(income_stmt, "Total Revenue")
    prev_revenue = _latest_value(income_stmt, "Total Revenue", offset=1)
    net_income = _latest_value(income_stmt, "Net Income")
    eps = _latest_value(income_stmt, ["Diluted EPS", "Basic EPS"])
    operating_income = _latest_value(
        income_stmt, ["Operating Income", "EBIT", "Total Operating Income As Reported"]
    )
    operating_cash_flow = _latest_value(
        cash_flow,
        ["Operating Cash Flow", "Total Cash From Operating Activities"],
    )
    interest_expense = _latest_value(income_stmt, "Interest Expense")
    total_debt = _latest_value(balance_sheet, "Total Debt")
    prev_total_debt = _latest_value(balance_sheet, "Total Debt", offset=1)
    total_assets = _latest_value(balance_sheet, ["Total Assets"])
    current_assets = _latest_value(balance_sheet, ["Total Current Assets"])
    current_liabilities = _latest_value(balance_sheet, ["Total Current Liabilities"])
    total_equity = _latest_value(
        balance_sheet,
        ["Total Stockholder Equity", "Total Equity Gross Minority Interest"],
    )
    cash_balance = _latest_value(
        balance_sheet,
        [
            "Cash And Cash Equivalents",
            "Cash Cash Equivalents And Short Term Investments",
            "Cash Financial",
        ],
    )

    forecast_revenue_growth = _extract_growth_value(
        first_nonempty_df(revenue_estimate, growth_estimates),
        ["revenue", "sales", "next year"],
    )
    forecast_eps_growth_short = _extract_growth_value(
        first_nonempty_df(earnings_estimate, growth_estimates),
        ["next year", "eps", "earnings"],
    )
    forecast_eps_growth_long = _extract_growth_value(
        growth_estimates, ["next 5 years", "long term"]
    )

    revenue_growth = (
        _ratio(total_revenue - prev_revenue, prev_revenue)
        if total_revenue is not None and prev_revenue not in (None, 0)
        else None
    )

    debt_trend = None
    if total_debt is not None and prev_total_debt is not None:
        change = total_debt - prev_total_debt
        direction = "flat"
        if abs(change) > 1e-9:
            direction = "up" if change > 0 else "down"
        debt_trend = {
            "latest": total_debt,
            "previous": prev_total_debt,
            "change": change,
            "direction": direction,
        }

    return sanitize_numpy_types(
        {
            "total_revenue": total_revenue,
            "net_income": net_income,
            "eps": eps,
            "operating_income": operating_income,
            "operating_cash_flow": operating_cash_flow,
            "forecast_revenue_growth_rate": forecast_revenue_growth,
            "forecast_eps_growth_rate_short": forecast_eps_growth_short,
            "forecast_eps_growth_rate_long": forecast_eps_growth_long,
            "forecast_revision_direction": _compute_revision_direction(eps_revisions),
            "return_on_assets": _ratio(net_income, total_assets),
            "return_on_invested_capital": _ratio(
                operating_income, (total_debt or 0) + (total_equity or 0)
            ),
            "interest_coverage": _ratio(operating_income, interest_expense),
            "cfo_to_total_debt": _ratio(operating_cash_flow, total_debt),
            "total_debt_trend": debt_trend,
            "current_ratio": _ratio(current_assets, current_liabilities),
            "debt_to_assets": _ratio(total_debt, total_assets),
            "ohlson_o_score": None,  # Placeholder: requires additional balance sheet inputs
            "analyst_price_target": _extract_price_target(analyst_targets),
            "historical_revenue_growth_rate": revenue_growth,
            "shares_outstanding": fast_info.get("shares") if isinstance(fast_info, dict) else None,
        }
    )


def gather_yfinance_snapshot(
    ticker: str, include_quarterly: bool = True
) -> Dict[str, Any]:
    logger.info("Admin yfinance probe for %s (include_quarterly=%s)", ticker, include_quarterly)
    yticker = yf.Ticker(ticker)
    errors: List[str] = []

    def safe_fetch(name: str, default=None):
        try:
            return getattr(yticker, name)
        except Exception as exc:
            msg = f"Failed to fetch {name}: {exc}"
            logger.warning(msg)
            errors.append(msg)
            return default

    fast_info = _to_plain_dict(safe_fetch("fast_info", {}))
    info = _to_plain_dict(safe_fetch("info", {}))
    calendar = _df_to_records(safe_fetch("calendar", pd.DataFrame()))

    income_stmt = safe_fetch("financials", pd.DataFrame())
    balance_sheet = safe_fetch("balance_sheet", pd.DataFrame())
    cash_flow = safe_fetch("cashflow", pd.DataFrame())

    market_data = {}
    try:
        month_hist = yticker.history(period="1mo")
        market_data["one_month_history"] = _history_to_records(month_hist, limit=8)
    except Exception as exc:
        msg = f"History fetch failed: {exc}"
        logger.warning(msg)
        errors.append(msg)

    for attr in ("dividends", "splits", "shares", "actions"):
        try:
            series = getattr(yticker, attr)
            if isinstance(series, pd.Series):
                market_data[attr] = _history_to_records(series.to_frame(), limit=8)
            elif isinstance(series, pd.DataFrame):
                market_data[attr] = _history_to_records(series, limit=8)
            elif hasattr(series, "tail"):
                # Fallback: try to convert tail-able objects to DataFrame
                try:
                    market_data[attr] = _history_to_records(
                        pd.DataFrame(series), limit=8
                    )
                except Exception:
                    pass
        except Exception as exc:
            msg = f"Failed to fetch {attr}: {exc}"
            logger.warning(msg)
            errors.append(msg)

    options_data = {}
    try:
        options = yticker.options
        options_data["expirations"] = options
        if options:
            chain = yticker.option_chain(options[0])
            options_data["first_chain"] = {
                "calls": _history_to_records(chain.calls, limit=5),
                "puts": _history_to_records(chain.puts, limit=5),
            }
    except Exception as exc:
        msg = f"Options fetch failed: {exc}"
        logger.warning(msg)
        errors.append(msg)

    def _trim_upgrades_downgrades(df: pd.DataFrame | None) -> pd.DataFrame:
        if not isinstance(df, pd.DataFrame) or df.empty:
            return pd.DataFrame()
        idx = pd.to_datetime(df.index, errors="coerce")
        try:
            idx = idx.tz_localize(None)
        except Exception:
            # If already naive or localization fails, continue with current idx
            pass
        mask = ~idx.isna()
        if mask.any():
            df = df.loc[mask]
            idx = idx[mask]
            cutoff_recent = pd.Timestamp.utcnow().tz_localize(None) - pd.DateOffset(months=18)
            recent_mask = idx >= cutoff_recent
            if recent_mask.any():
                df = df.loc[recent_mask]
                idx = idx[recent_mask]
            # If nothing in the last 18 months, fall back to all available
            df = df.sort_index(ascending=False)
        return df

    estimates = {
        "earnings_dates": _df_to_records(safe_fetch("earnings_dates", pd.DataFrame())),
        "earnings_estimate": _df_to_records(
            safe_fetch("earnings_estimate", pd.DataFrame())
        ),
        "revenue_estimate": _df_to_records(
            safe_fetch("revenue_estimate", pd.DataFrame())
        ),
        "eps_trend": _df_to_records(safe_fetch("eps_trend", pd.DataFrame())),
        "eps_revisions": _df_to_records(
            safe_fetch("eps_revisions", pd.DataFrame())
        ),
        "growth_estimates": _df_to_records(
            safe_fetch("growth_estimates", pd.DataFrame())
        ),
        "analyst_price_targets": _df_to_records(
            safe_fetch("analyst_price_targets", pd.DataFrame())
        ),
        "recommendations": _df_to_records(
            safe_fetch("recommendations", pd.DataFrame()), max_rows=30
        ),
        "recommendations_summary": _df_to_records(
            safe_fetch("recommendations_summary", pd.DataFrame())
        ),
        "upgrades_downgrades": _df_to_records(
            _trim_upgrades_downgrades(safe_fetch("upgrades_downgrades", pd.DataFrame())),
            max_rows=120,
            use_head=True,
        ),
        "calendar": calendar,
    }

    def _fetch_quarterly_statement(method_name: str, attr_name: str) -> pd.DataFrame:
        try:
            method = getattr(yticker, method_name, None)
            if callable(method):
                df = method(freq="quarterly")
                if isinstance(df, pd.DataFrame) and not df.empty:
                    return df
        except Exception as exc:
            msg = f"Failed to fetch {method_name} quarterly: {exc}"
            logger.warning(msg)
            errors.append(msg)

        try:
            df_attr = getattr(yticker, attr_name, pd.DataFrame())
            if isinstance(df_attr, pd.DataFrame) and not df_attr.empty:
                return df_attr
        except Exception as exc:
            msg = f"Failed to fetch {attr_name}: {exc}"
            logger.warning(msg)
            errors.append(msg)

        return pd.DataFrame()

    quarterly = {}
    if include_quarterly:
        quarterly_income_stmt = _fetch_quarterly_statement(
            "get_income_stmt", "quarterly_financials"
        )
        quarterly_balance_sheet = _fetch_quarterly_statement(
            "get_balance_sheet", "quarterly_balance_sheet"
        )
        quarterly_cash_flow = _fetch_quarterly_statement(
            "get_cash_flow", "quarterly_cashflow"
        )
        if quarterly_cash_flow.empty:
            # Try alternate attribute name if available
            quarterly_cash_flow = _fetch_quarterly_statement(
                "get_cash_flow", "quarterly_cash_flow"
            )

        quarterly = {
            "income_statement": _df_to_records(
                quarterly_income_stmt, max_cols=12
            ),
            "balance_sheet": _df_to_records(
                quarterly_balance_sheet, max_cols=12
            ),
            "cash_flow": _df_to_records(
                quarterly_cash_flow, max_cols=12
            ),
            "earnings": _df_to_records(
                safe_fetch("quarterly_earnings", pd.DataFrame())
            ),
        }

    statements = {
        "income_statement": _df_to_records(income_stmt),
        "balance_sheet": _df_to_records(balance_sheet),
        "cash_flow": _df_to_records(cash_flow),
    }

    analyst_targets_raw = safe_fetch("analyst_price_targets", None)
    metrics = compute_metrics(
        income_stmt,
        balance_sheet,
        cash_flow,
        fast_info,
        safe_fetch("revenue_estimate", pd.DataFrame()),
        safe_fetch("earnings_estimate", pd.DataFrame()),
        safe_fetch("growth_estimates", pd.DataFrame()),
        safe_fetch("eps_revisions", pd.DataFrame()),
        analyst_targets_raw,
    )

    news_items = []
    try:
        news = yticker.news
        if news:
            for item in news[:5]:
                news_items.append(
                    {
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "publisher": item.get("publisher"),
                        "providerPublishTime": item.get("providerPublishTime"),
                    }
                )
    except Exception as exc:
        msg = f"News fetch failed: {exc}"
        logger.warning(msg)
        errors.append(msg)

    sustainability = _df_to_records(safe_fetch("sustainability", pd.DataFrame()))

    snapshot = {
        "ticker": ticker.upper(),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "basic": {"fast_info": fast_info, "info": info},
        "statements": statements,
        "quarterly": quarterly,
        "estimates": estimates,
        "market_data": market_data,
        "options": options_data,
        "metrics": metrics,
        "news": news_items,
        "sustainability": sustainability,
        "meta": {"errors": errors},
    }
    return sanitize_numpy_types(snapshot)
