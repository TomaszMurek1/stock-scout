import logging
import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict

from database.financials import CompanyFinancialHistory, CompanyFinancials
from database.company import Company
from database.market import Market
from database.stock_data import CompanyMarketData
from services.fundamentals.fetch_financial_data_executor import (
    get_most_recent_column,
    update_market_data,
    update_financial_snapshot,
    get_first_valid_row,
    safe_get,
)
from services.utils.db_retry import retry_on_db_lock

logger = logging.getLogger(__name__)


def get_market_by_name(db: Session, market_name: str) -> Market:
    market = db.query(Market).filter_by(name=market_name).first()
    if not market:
        logger.error(f"Market not found: {market_name}")
    return market


def get_companies_by_tickers(db: Session, tickers: List[str]) -> List[Company]:
    companies = []
    for ticker in tickers:
        comp = db.query(Company).filter_by(ticker=ticker).first()
        if not comp:
            logger.error(f"Unknown ticker: {ticker}")
            continue
        companies.append(comp)
    return companies


def get_latest_report_dates(
    db: Session, company_ids: List[int], market_id: int
) -> Dict[int, datetime]:
    """Return {company_id: latest_report_end_date}."""
    rows = (
        db.query(
            CompanyFinancialHistory.company_id,
            func.max(CompanyFinancialHistory.report_end_date),
        )
        .filter(CompanyFinancialHistory.market_id == market_id)
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))
        .group_by(CompanyFinancialHistory.company_id)
        .all()
    )
    return {cid: dt for cid, dt in rows}


def should_update_financials(
    latest_report_date: datetime | None, today: datetime.date
) -> bool:
    """True if update needed based on (year - 15 days) rule."""
    if not latest_report_date:
        return True
    date_only = (
        latest_report_date.date()
        if isinstance(latest_report_date, datetime)
        else latest_report_date
    )
    if date_only > today:
        return False
    # Only update if it's at least 350 days old
    return (today - date_only).days >= 350


def preload_existing_financials(db: Session, company_ids: List[int], market_id: int):
    """Preload existing snapshots and history for upsert skipping."""
    market_data = {
        md.company_id: md
        for md in db.query(CompanyMarketData)
        .filter(CompanyMarketData.market_id == market_id)
        .filter(CompanyMarketData.company_id.in_(company_ids))
        .all()
    }
    financials = {
        fn.company_id: fn
        for fn in db.query(CompanyFinancials)
        .filter(CompanyFinancials.market_id == market_id)
        .filter(CompanyFinancials.company_id.in_(company_ids))
        .all()
    }
    history_keys = set(
        db.query(
            CompanyFinancialHistory.company_id,
            CompanyFinancialHistory.report_end_date,
        )
        .filter(CompanyFinancialHistory.market_id == market_id)
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))
        .all()
    )
    return market_data, financials, history_keys


def build_financial_history_mappings(
    company,
    market,
    income_stmt,
    balance_sheet,
    cashflow,
    fast_info,
    now,
    existing_history_keys,
) -> List[dict]:
    mappings = []
    if income_stmt is None or income_stmt.empty:
        logger.info(
            f"[{company.ticker}] No income statement, skipping history mapping."
        )
        return mappings
    bs_df = balance_sheet if isinstance(balance_sheet, pd.DataFrame) else pd.DataFrame()
    cf_df = cashflow if isinstance(cashflow, pd.DataFrame) else pd.DataFrame()
    added_count = 0
    for col in income_stmt.columns:
        end_date = (
            col.to_pydatetime()
            if hasattr(col, "to_pydatetime")
            else datetime.strptime(str(col), "%Y-%m-%d")
        )
        key = (company.company_id, end_date)
        if key in existing_history_keys:
            continue
        hist_data = {
            "company_id": company.company_id,
            "market_id": market.market_id,
            "report_end_date": end_date,
            "net_income": safe_get(income_stmt, "Net Income", col),
            "total_revenue": safe_get(income_stmt, "Total Revenue", col),
            "ebit": safe_get(income_stmt, "EBIT", col),
            "ebitda": get_first_valid_row(
                income_stmt, ["EBITDA", "Normalized EBITDA"], col
            ),
            "diluted_eps": safe_get(income_stmt, "Diluted EPS", col),
            "basic_eps": safe_get(income_stmt, "Basic EPS", col),
            "operating_income": get_first_valid_row(
                income_stmt,
                ["Operating Income", "Total Operating Income As Reported"],
                col,
            ),
            "interest_income": safe_get(income_stmt, "Interest Income", col),
            "interest_expense": safe_get(income_stmt, "Interest Expense", col),
            "depreciation_amortization": safe_get(
                income_stmt, "Reconciled Depreciation", col
            )
            or safe_get(cf_df, "Depreciation And Amortization", col),
            "free_cash_flow": safe_get(cf_df, "Free Cash Flow", col),
            "capital_expenditure": safe_get(cf_df, "Capital Expenditure", col),
            "total_debt": safe_get(bs_df, "Total Debt", col),
            "cash_and_cash_equivalents": get_first_valid_row(
                bs_df,
                [
                    "Cash And Cash Equivalents",
                    "Cash Cash Equivalents And Short Term Investments",
                    "Cash Financial",
                ],
                col,
            ),
            "shares_outstanding": fast_info.get("shares"),
            "last_updated": now,
        }
        mappings.append(hist_data)
        existing_history_keys.add(key)
        added_count += 1
    logger.info(
        f"[{company.ticker}] Prepared {added_count} new CompanyFinancialHistory row(s)."
    )
    return mappings


def is_missing_or_delisted_fast_info(fast_info: dict) -> bool:
    """
    Returns True if fast_info is empty, not a dict, or all values are None.
    """
    if not fast_info or not isinstance(fast_info, dict):
        return True
    # If all values are None, treat as missing/delisted as well:
    return all(v is None for v in fast_info.values())


@retry_on_db_lock
def fetch_and_save_financial_data_for_list_of_tickers(
    tickers: List[str], market_name: str, db: Session
) -> Dict:
    """
    For a list of tickers, fetch and upsert financials and market data using yfinance.
    Only operates on tickers that have passed the pre-check.
    """
    market = get_market_by_name(db, market_name)
    if not market:
        return {"status": "error", "message": f"Unknown market: {market_name}"}

    companies = get_companies_by_tickers(db, tickers)
    if not companies:
        return {"status": "error", "message": "No valid tickers found"}

    comp_ids = [c.company_id for c in companies]
    market_data, financials, history_keys = preload_existing_financials(
        db, comp_ids, market.market_id
    )

    logger.info(
        f"Initiating yf.Tickers batch fetch for {len(tickers)} tickers: {tickers}"
    )
    yf_batch = yf.Tickers(" ".join(tickers))

    now = datetime.now(timezone.utc)
    history_mappings = []
    total_mappings = 0
    for comp in companies:
        ticker = comp.ticker

        # yfinance interaction:
        y_t = yf_batch.tickers.get(ticker) or yf.Ticker(ticker)
        fast_info = getattr(y_t, "fast_info", {}) or {}
        income_stmt = getattr(y_t, "income_stmt", None)
        balance_sheet = getattr(y_t, "balance_sheet", None)
        cashflow = getattr(y_t, "cashflow", None)
        info_dict = getattr(y_t, "get_info", lambda: {})() or {}

        # Market data upsert
        md = market_data.get(comp.company_id) or CompanyMarketData(
            company_id=comp.company_id, market_id=market.market_id
        )

        if is_missing_or_delisted_fast_info(fast_info):
            logger.warning(
                f"No valid fast_info for ticker {ticker} (may be delisted or invalid)"
            )
            md.current_price = None
            md.last_updated = datetime.now(timezone.utc)
            if hasattr(md, "is_delisted"):
                md.is_delisted = True
            db.add(md)
            continue

        update_market_data(md, fast_info)
        db.add(md)

        # Financials snapshot upsert
        fn = financials.get(comp.company_id) or CompanyFinancials(
            company_id=comp.company_id, market_id=market.market_id
        )
        if income_stmt is not None and not income_stmt.empty:
            col = get_most_recent_column(income_stmt.columns)
            bs_df = (
                balance_sheet
                if isinstance(balance_sheet, pd.DataFrame)
                else pd.DataFrame()
            )
            cf_df = cashflow if isinstance(cashflow, pd.DataFrame) else pd.DataFrame()
            update_financial_snapshot(
                ticker, fn, income_stmt, cf_df, bs_df, info_dict, fast_info, col
            )
        db.add(fn)

        # Build new financial history (no duplicates)
        mappings = build_financial_history_mappings(
            comp,
            market,
            income_stmt,
            balance_sheet,
            cashflow,
            fast_info,
            now,
            history_keys,
        )
        total_mappings += len(mappings)
        history_mappings.extend(mappings)

    db.commit()

    # Count actual inserted rows by comparing before/after count
    inserted_count = 0
    if history_mappings:
        before = db.query(CompanyFinancialHistory).count()
        db.bulk_insert_mappings(CompanyFinancialHistory, history_mappings)
        db.commit()
        after = db.query(CompanyFinancialHistory).count()
        inserted_count = after - before
        logger.info(
            (
                f"Attempted to insert {total_mappings} row(s); actually inserted "
                f"{inserted_count} to CompanyFinancialHistory for tickers: {tickers}"
            )
        )
        return {"status": "success", "inserted_history": inserted_count}

    logger.info(
        f"No new CompanyFinancialHistory rows to insert for tickers:"
        f"{tickers} (prepared: {total_mappings})"
    )
    return {"status": "success", "inserted_history": 0}


def update_financials_for_tickers(
    db: Session,
    tickers: list[str],
    market_name: str,
    batch_size: int = 50,
    log_skips: bool = False,
):
    """
    For each ticker, checks latest report_end_date in DB:
    - If report_end_date is in future: skip API call.
    - If report_end_date is in past and age < (1 year - 15 days): skip API call.
    - Else: fetch and upsert new data from yfinance, batching API calls for efficiency.
    """
    market = get_market_by_name(db, market_name)
    if not market:
        return

    companies = get_companies_by_tickers(db, tickers)
    if not companies:
        return

    company_ids = [c.company_id for c in companies]
    latest_reports = get_latest_report_dates(db, company_ids, market.market_id)
    today = datetime.now(timezone.utc).date()

    eligible_tickers = []
    for comp in companies:
        last_dt = latest_reports.get(comp.company_id)
        if should_update_financials(last_dt, today):
            logger.info(f"[{comp.ticker}] Needs financial data update. {last_dt}")
            eligible_tickers.append(comp.ticker)
        else:
            if log_skips:
                if not last_dt:
                    logger.info(f"[{comp.ticker}] No previous reports; will update.")
                else:
                    logger.info(
                        (
                            f"[{comp.ticker}] Last report "
                            f"{last_dt.date() if last_dt else None} is recent/future, "
                            "skipping."
                        )
                    )

    if not eligible_tickers:
        logger.info("No tickers require financial data update. All up-to-date.")
        return {"status": "skipped", "updated": 0, "reason": "no_tickers_need_update"}

    def chunked(seq, size):
        for i in range(0, len(seq), size):
            yield seq[i : i + size]

    total_inserted = 0
    for chunk in chunked(eligible_tickers, batch_size):
        logger.info(f"Updating batch: {chunk}")
        res = fetch_and_save_financial_data_for_list_of_tickers(
            tickers=chunk,
            market_name=market_name,
            db=db,
        )
        logger.info(
            f"Batch completed: {res.get('inserted_history', 0)} "
            f"new CompanyFinancialHistory rows inserted for tickers: {chunk}"
        )
        total_inserted += res.get("inserted_history", 0)

    logger.info(
        f"Financials update done for market {market_name}. "
        f"Tickers checked: {len(tickers)}, updated: {len(eligible_tickers)}. "
        f"Total CompanyFinancialHistory rows inserted: {total_inserted}"
    )
    return {
        "status": "success",
        "updated": len(eligible_tickers),
        "total_inserted": total_inserted,
    }
