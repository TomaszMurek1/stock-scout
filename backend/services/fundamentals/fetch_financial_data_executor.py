# This module contains the core logic for fetching and saving financial data for a given company and market.
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import yfinance as yf
from database.company import Company
from database.market import Market
from database.stock_data import CompanyMarketData
from database.financials import CompanyFinancials, CompanyFinancialHistory

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


def update_market_data(record, fast_info):
    record.current_price = fast_info.get("lastPrice")
    record.previous_close = fast_info.get("regularMarketPreviousClose")
    record.day_high = fast_info.get("dayHigh")
    record.day_low = fast_info.get("dayLow")
    record.fifty_two_week_high = fast_info.get("yearHigh")
    record.fifty_two_week_low = fast_info.get("yearLow")
    record.market_cap = fast_info.get("marketCap")
    record.volume = fast_info.get("lastVolume")
    record.average_volume = fast_info.get("threeMonthAverageVolume")
    record.bid_price = None
    record.ask_price = None
    record.shares_outstanding = fast_info.get("shares")
    record.last_updated = datetime.now(timezone.utc)


def update_financial_snapshot(
    fin_record, income_stmt, cashflow, balance_sheet, info_dict, fast_info, col
):
    logger.warning(
        f"[{'ticker'}] Entered update_financial_snapshot. Price: {fast_info.get('lastPrice')}"
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


def upsert_financial_history(
    db, company_id, market_id, income_stmt, cashflow, balance_sheet, fast_info, col
):
    end_date = (
        col.to_pydatetime()
        if hasattr(col, "to_pydatetime")
        else datetime.strptime(str(col), "%Y-%m-%d")
    )

    record = (
        db.query(CompanyFinancialHistory)
        .filter_by(company_id=company_id, market_id=market_id, report_end_date=end_date)
        .first()
    )

    hist_data = dict(
        net_income=safe_get(income_stmt, "Net Income", col),
        total_revenue=safe_get(income_stmt, "Total Revenue", col),
        ebit=safe_get(income_stmt, "EBIT", col),
        ebitda=get_first_valid_row(income_stmt, ["EBITDA", "Normalized EBITDA"], col),
        diluted_eps=safe_get(income_stmt, "Diluted EPS", col),
        basic_eps=safe_get(income_stmt, "Basic EPS", col),
        operating_income=get_first_valid_row(
            income_stmt, ["Operating Income", "Total Operating Income As Reported"], col
        ),
        interest_income=safe_get(income_stmt, "Interest Income", col),
        interest_expense=safe_get(income_stmt, "Interest Expense", col),
        depreciation_amortization=safe_get(income_stmt, "Reconciled Depreciation", col)
        or safe_get(cashflow, "Depreciation And Amortization", col),
        free_cash_flow=safe_get(cashflow, "Free Cash Flow", col),
        capital_expenditure=safe_get(cashflow, "Capital Expenditure", col),
        total_debt=safe_get(balance_sheet, "Total Debt", col),
        cash_and_cash_equivalents=get_first_valid_row(
            balance_sheet,
            [
                "Cash And Cash Equivalents",
                "Cash Cash Equivalents And Short Term Investments",
                "Cash Financial",
            ],
            col,
        ),
        shares_outstanding=fast_info.get("shares"),
        last_updated=datetime.now(timezone.utc),
    )

    if not record:
        db.add(
            CompanyFinancialHistory(
                company_id=company_id,
                market_id=market_id,
                report_end_date=end_date,
                **hist_data,
            )
        )
    else:
        for k, v in hist_data.items():
            setattr(record, k, v)


def fetch_and_save_financial_data_core(
    ticker: str, market_name: str, db: Session
) -> dict:
    company = db.query(Company).filter_by(ticker=ticker).first()
    market = db.query(Market).filter_by(name=market_name).first()
    if not company or not market:
        return {"status": "error", "message": "Company or market not found"}

    financial_record = db.query(CompanyFinancials).filter_by(
        company_id=company.company_id, market_id=market.market_id
    ).first() or CompanyFinancials(
        company_id=company.company_id, market_id=market.market_id
    )
    db.add(financial_record)

    market_data_record = db.query(CompanyMarketData).filter_by(
        company_id=company.company_id, market_id=market.market_id
    ).first() or CompanyMarketData(
        company_id=company.company_id, market_id=market.market_id
    )
    db.add(market_data_record)

    try:
        y_ticker = yf.Ticker(ticker)
        fast_info = y_ticker.fast_info
        income_stmt = y_ticker.income_stmt
        balance_sheet = y_ticker.balance_sheet
        cashflow = y_ticker.cashflow
        info_dict = y_ticker.get_info()
    except Exception as e:
        return {"status": "error", "message": str(e)}

    if income_stmt.empty:
        return {"status": "no_data", "message": "No income statement available"}

    update_market_data(market_data_record, fast_info)
    most_recent_col = get_most_recent_column(income_stmt.columns)
    update_financial_snapshot(
        financial_record,
        income_stmt,
        cashflow,
        balance_sheet,
        info_dict,
        fast_info,
        most_recent_col,
    )

    for col in income_stmt.columns:
        upsert_financial_history(
            db,
            company.company_id,
            market.market_id,
            income_stmt,
            cashflow,
            balance_sheet,
            fast_info,
            col,
        )

    try:
        db.commit()
        return {"status": "success", "message": "Data updated"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": f"Commit failed: {e}"}
