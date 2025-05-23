# This module contains the core logic for fetching and saving financial data
# for a given company and market.
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
import logging
from datetime import datetime, timezone


logger = logging.getLogger(__name__)
# logging.basicConfig(
#     level=logging.DEBUG,
#     format="%(asctime)s - %(levelname)s - %(message)s"
# )


def get_first_valid_row(df, keys, col):
    for key in keys:
        value = safe_get(df, key, col)
        if value is not None:
            return value
    return None


def safe_get(df, row, col):
    lookup = {i.strip().lower(): i for i in df.index}
    key = row.strip().lower()

    if key not in lookup:
        # logger.warning(f"[safe_get] Row '{row}' not found. Index: {list(df.index)}")
        return None

    return df.loc[lookup[key], col] if col in df.columns else None


def get_most_recent_column(columns):
    date_columns = [
        (
            c.to_pydatetime()
            if hasattr(c, "to_pydatetime")
            else datetime.strptime(str(c), "%Y-%m-%d")
        )
        for c in columns
    ]
    return columns[date_columns.index(max(date_columns))]


def _to_decimal_two_places(value):
    """
    Convert a float or string to Decimal with exactly two decimal places,
    rounding half-up. Returns None if input is None or invalid.
    """
    if value is None:
        return None
    try:
        d = Decimal(str(value))
        return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        return None


def update_market_data(record, fast_info):
    record.current_price = _to_decimal_two_places(fast_info.get("lastPrice"))
    record.previous_close = _to_decimal_two_places(
        fast_info.get("regularMarketPreviousClose")
    )
    record.day_high = _to_decimal_two_places(fast_info.get("dayHigh"))
    record.day_low = _to_decimal_two_places(fast_info.get("dayLow"))
    record.fifty_two_week_high = _to_decimal_two_places(fast_info.get("yearHigh"))
    record.fifty_two_week_low = _to_decimal_two_places(fast_info.get("yearLow"))
    record.market_cap = fast_info.get("marketCap")
    record.volume = fast_info.get("lastVolume")
    record.average_volume = fast_info.get("threeMonthAverageVolume")
    record.bid_price = None
    record.ask_price = None
    record.shares_outstanding = fast_info.get("shares")
    record.last_updated = datetime.now(timezone.utc)


def update_financial_snapshot(
    ticker, fin_record, income_stmt, cashflow, balance_sheet, info_dict, fast_info, col
):
    logger.warning(
        f"[{ticker}] Entered update_financial_snapshot. "
        f"Price: {fast_info.get('lastPrice')}"
    )

    fin_record.net_income = safe_get(income_stmt, "Net Income", col)
    fin_record.total_revenue = safe_get(income_stmt, "Total Revenue", col)
    fin_record.ebit = safe_get(income_stmt, "EBIT", col)
    fin_record.ebitda = get_first_valid_row(
        income_stmt, ["EBITDA", "Normalized EBITDA"], col
    )
    fin_record.diluted_eps = safe_get(income_stmt, "Diluted EPS", col)
    fin_record.basic_eps = safe_get(income_stmt, "Basic EPS", col)
    fin_record.interest_income = safe_get(income_stmt, "Interest Income", col)
    fin_record.interest_expense = safe_get(income_stmt, "Interest Expense", col)
    fin_record.operating_income = get_first_valid_row(
        income_stmt, ["Operating Income", "Total Operating Income As Reported"], col
    )
    fin_record.total_debt = safe_get(balance_sheet, "Total Debt", col)
    fin_record.cash_and_cash_equivalents = get_first_valid_row(
        balance_sheet,
        [
            "Cash And Cash Equivalents",
            "Cash Cash Equivalents And Short Term Investments",
            "Cash Financial",
        ],
        col,
    )
    fin_record.shares_outstanding = fast_info.get("shares")
    fin_record.current_price = fast_info.get("lastPrice")

    gross_profit = safe_get(income_stmt, "Gross Profit", col)
    if gross_profit is None:
        revenue = safe_get(income_stmt, "Total Revenue", col)
        cost_of_revenue = safe_get(income_stmt, "Cost Of Revenue", col)
        if revenue is not None and cost_of_revenue is not None:
            gross_profit = revenue - cost_of_revenue
    fin_record.gross_profit = gross_profit

    fin_record.depreciation_amortization = safe_get(
        income_stmt, "Reconciled Depreciation", col
    ) or safe_get(cashflow, "Depreciation And Amortization", col)
    fin_record.free_cash_flow = safe_get(cashflow, "Free Cash Flow", col)
    fin_record.capital_expenditure = safe_get(cashflow, "Capital Expenditure", col)
    fin_record.enterprise_value = info_dict.get("enterpriseValue")
    fin_record.last_updated = datetime.now(timezone.utc)

    fiscal_year_end = info_dict.get("lastFiscalYearEnd")
    most_recent_q = info_dict.get("mostRecentQuarter")

    if fiscal_year_end:
        fin_record.last_fiscal_year_end = datetime.fromtimestamp(
            fiscal_year_end, timezone.utc
        )
    if most_recent_q:
        fin_record.most_recent_report = datetime.fromtimestamp(
            most_recent_q, timezone.utc
        )
