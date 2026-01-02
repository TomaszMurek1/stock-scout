import logging
import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict

from utils.sanitize import sanitize_numpy_types
from database.financials import (
    CompanyEpsRevisionHistory,
    CompanyEstimateHistory,
    CompanyFinancialHistory,
    CompanyFinancials,
    CompanyRecommendationHistory,
)
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
from utils.db_retry import retry_on_db_lock

logger = logging.getLogger(__name__)


def _is_missing_number(value) -> bool:
  return value is None or (isinstance(value, (float, int)) and (pd.isna(value) or value != value))


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
    db: Session, company_ids: List[int]
) -> Dict[int, Dict[str, datetime]]:
    """Return {company_id: {period_type: latest_report_end_date}} for annual and quarterly."""
    rows = (
        db.query(
            CompanyFinancialHistory.company_id,
            CompanyFinancialHistory.period_type,
            func.max(CompanyFinancialHistory.report_end_date),
        )
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))
        .group_by(CompanyFinancialHistory.company_id, CompanyFinancialHistory.period_type)
        .all()
    )
    data: Dict[int, Dict[str, datetime]] = {}
    for cid, period_type, dt in rows:
        data.setdefault(cid, {})[period_type] = dt
    return data



def should_update_financials(
    latest_annual: datetime | None,
    latest_quarter: datetime | None,
    today: datetime.date,
) -> bool:
    """True if update needed based on separate thresholds for annual vs quarterly."""

    def needs_refresh(dt: datetime | None, threshold_days: int) -> bool:
        if not dt:
            return True
        date_only = dt.date() if isinstance(dt, datetime) else dt
        if date_only > today:
            return False
        return (today - date_only).days >= threshold_days

    # Annual reports: ~350 days, quarterly: ~80 days
    return needs_refresh(latest_annual, 350) or needs_refresh(latest_quarter, 80)


def preload_existing_financials(
    db: Session,
    company_ids: List[int],
    market_id: int | None = None,  # kept only for backwards compatibility
):
    """Preload existing snapshots and history for upsert skipping (company-level)."""
    # CompanyMarketData is now only linked by company_id
    market_data = {
        md.company_id: md
        for md in db.query(CompanyMarketData)
        .filter(CompanyMarketData.company_id.in_(company_ids))
        .all()
    }

    # CompanyFinancials is also company-level now
    financials = {
        fn.company_id: fn
        for fn in db.query(CompanyFinancials)
        .filter(CompanyFinancials.company_id.in_(company_ids))
        .all()
    }

    # History keys are unique on (company_id, report_end_date, period_type)
    history_keys = set(
        db.query(
            CompanyFinancialHistory.company_id,
            CompanyFinancialHistory.report_end_date,
            CompanyFinancialHistory.period_type,
        )
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))
        .all()
    )

    reco_keys = set(
        db.query(
            CompanyRecommendationHistory.company_id,
            CompanyRecommendationHistory.action_date,
            CompanyRecommendationHistory.firm,
            CompanyRecommendationHistory.action,
            CompanyRecommendationHistory.to_grade,
        )
        .filter(CompanyRecommendationHistory.company_id.in_(company_ids))
        .all()
    )

    estimate_keys = set(
        db.query(
            CompanyEstimateHistory.company_id,
            CompanyEstimateHistory.estimate_type,
            CompanyEstimateHistory.period_label,
        )
        .filter(CompanyEstimateHistory.company_id.in_(company_ids))
        .all()
    )

    eps_revision_keys = set(
        db.query(
            CompanyEpsRevisionHistory.company_id,
            CompanyEpsRevisionHistory.period_label,
        )
        .filter(CompanyEpsRevisionHistory.company_id.in_(company_ids))
        .all()
    )

    return (
        market_data,
        financials,
        history_keys,
        reco_keys,
        estimate_keys,
        eps_revision_keys,
    )




def build_financial_history_mappings(
    company,
    income_stmt,
    balance_sheet,
    cashflow,
    fast_info,
    now,
    existing_history_keys,
    period_type: str,
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
        key = (company.company_id, end_date, period_type)
        if key in existing_history_keys:
            continue

        # Skip rows with no revenue to avoid inserting empty/quarterly-like records
        total_revenue_val = safe_get(income_stmt, "Total Revenue", col)
        if _is_missing_number(total_revenue_val):
            continue

        hist_data = {
            "company_id": company.company_id,
            "report_end_date": end_date,
            "period_type": period_type,
            "net_income": safe_get(income_stmt, "Net Income", col),
            "total_revenue": total_revenue_val,
            "ebitda": get_first_valid_row(
                income_stmt, ["EBITDA", "Normalized EBITDA"], col
            ),
            "ebit": get_first_valid_row(
                income_stmt,
                [
                    "EBIT",
                    "Ebit",
                    "Operating Income",
                    "Earnings Before Interest And Taxes",
                    "Earnings Before Interest And Tax",
                ],
                col,
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
            "dividends_paid": get_first_valid_row(
                cf_df,
                ["Cash Dividends Paid", "Common Stock Dividend Paid"],
                col
            ),
            "total_debt": safe_get(bs_df, "Total Debt", col),
            "total_assets": safe_get(bs_df, "Total Assets", col),
            "total_liabilities": get_first_valid_row(
                bs_df, ["Total Liabilities Net Minority Interest", "Total Liabilities"], col
            ),
            "total_equity": get_first_valid_row(
                bs_df,
                ["Total Stockholder Equity", "Stockholders Equity", "Total Equity Gross Minority Interest"],
                col,
            ),
            "current_assets": get_first_valid_row(
                bs_df,
                ["Total Current Assets", "Current Assets"],
                col,
            ),
            "current_liabilities": get_first_valid_row(
                bs_df,
                ["Total Current Liabilities", "Current Liabilities"],
                col,
            ),
            "cash_and_cash_equivalents": get_first_valid_row(
                bs_df,
                [
                    "Cash And Cash Equivalents",
                    "Cash Cash Equivalents And Short Term Investments",
                    "Cash Financial",
                ],
                col,
            ),
            "operating_cash_flow": get_first_valid_row(
                cf_df,
                ["Operating Cash Flow", "Cash Flow From Continuing Operating Activities"],
                col,
            ),
            "working_capital": None,
            "shares_outstanding": fast_info.get("shares"),
            "last_updated": now,
        }

        # Try extracting Gross Profit or calculate from Revenue - Cost Of Revenue
        gross_profit = safe_get(income_stmt, "Gross Profit", col)
        if gross_profit is None:
            cost_of_rev = safe_get(income_stmt, "Cost Of Revenue", col)
            if total_revenue_val is not None and cost_of_rev is not None:
                gross_profit = total_revenue_val - cost_of_rev
        hist_data["gross_profit"] = gross_profit

        if hist_data["current_assets"] is not None and hist_data["current_liabilities"] is not None:
            hist_data["working_capital"] = hist_data["current_assets"] - hist_data["current_liabilities"]
        
        # Fallback for EBIT: Pretax Income + Interest Expense
        if hist_data["ebit"] is None:
            pretax = safe_get(income_stmt, "Pretax Income", col)
            interest = safe_get(income_stmt, "Interest Expense", col)
            if pretax is not None and interest is not None:
                hist_data["ebit"] = pretax + interest

        mappings.append(hist_data)
        existing_history_keys.add(key)
        added_count += 1
    # Fallback: if EBIT missing but EBITA and depreciation available, fill it
    # Also Fallback: if EBITDA missing but EBIT and depreciation available, fill it
    for item in mappings:
        if item.get("ebit") is None and item.get("ebitda") is not None and item.get("depreciation_amortization") is not None:
            item["ebit"] = item["ebitda"] - item["depreciation_amortization"]
        if item.get("ebitda") is None and item.get("ebit") is not None and item.get("depreciation_amortization") is not None:
            item["ebitda"] = item["ebit"] + item["depreciation_amortization"]
        
    logger.info(
        f"[{company.ticker}] Prepared {added_count} new CompanyFinancialHistory row(s)."
    )
    return mappings


def is_missing_or_delisted_fast_info(
    fast_info: dict, info_dict: dict = None, must_have=None, logger=None, ticker=None
) -> bool:
    """
    Returns True if all fields in must_have are missing or None in BOTH fast_info
    and info_dict. Logs what is present and what is missing.
    """
    if must_have is None:
        must_have = ["current_price", "regularMarketPrice", "lastPrice", "marketCap"]
    missing = []
    found = []
    for key in must_have:
        try:
            val = (fast_info or {}).get(key)
        except Exception:
            # yfinance FastInfo can raise KeyError: 'currentTradingPeriod' or others internally
            val = None

        if val is not None:
            found.append(key)
        else:
            # fallback to info_dict
            if info_dict and info_dict.get(key) is not None:
                found.append(key)
            else:
                missing.append(key)
    if logger and ticker:
        logger.info(f"{ticker}: Found fields: {found}, Missing fields: {missing}")
    return len(found) == 0  # True if all are missing


@retry_on_db_lock
def fetch_and_save_financial_data_for_list_of_tickers(
    tickers: List[str], market_name: str, db: Session, include_quarterly: bool = True
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
    (
        market_data,
        financials,
        history_keys,
        reco_keys,
        estimate_keys,
        eps_revision_keys,
    ) = preload_existing_financials(db, comp_ids)

    logger.info(
        f"Initiating yf.Tickers batch fetch for {len(tickers)} tickers: {tickers}"
    )
    yf_batch = yf.Tickers(" ".join(tickers))

    now = datetime.now(timezone.utc)
    history_mappings = []
    reco_mappings = []
    estimate_mappings = []
    eps_revision_mappings = []
    total_mappings = 0
    per_ticker_errors: list[dict] = []

    for comp in companies:
        ticker = comp.ticker

        # Skip explicitly delisted companies if flagged
        if comp.yfinance_market and "delist" in comp.yfinance_market.lower():
            logger.info("[%s] Skipping delisted ticker (yfinance_market=%s)", ticker, comp.yfinance_market)
            continue

        # yfinance interaction:
        y_t = yf_batch.tickers.get(ticker) or yf.Ticker(ticker)

        def _safe_stmt(method_name: str, attr_name: str, freq: str | None = None):
            try:
                method = getattr(y_t, method_name, None)
                if callable(method):
                    return method(freq=freq) if freq else method()
            except Exception:
                pass
            try:
                return getattr(y_t, attr_name)
            except Exception:
                return None

        try:
            fast_info = getattr(y_t, "fast_info", {}) or {}
            income_stmt = getattr(y_t, "income_stmt", None)
            balance_sheet = getattr(y_t, "balance_sheet", None)
            cashflow = getattr(y_t, "cashflow", None)
            info_dict = getattr(y_t, "get_info", lambda: {})() or {}
            q_income_stmt = (
                _safe_stmt("get_income_stmt", "quarterly_income_stmt", freq="quarterly")
                if include_quarterly
                else None
            )
            q_balance_sheet = (
                _safe_stmt("get_balance_sheet", "quarterly_balance_sheet", freq="quarterly")
                if include_quarterly
                else None
            )
            q_cashflow = (
                _safe_stmt("get_cash_flow", "quarterly_cashflow", freq="quarterly")
                if include_quarterly
                else None
            )
            if include_quarterly and (q_cashflow is None or (hasattr(q_cashflow, "empty") and q_cashflow.empty)):
                q_cashflow = _safe_stmt(
                    "get_cash_flow", "quarterly_cash_flow", freq="quarterly"
                )
            earnings_estimate = getattr(y_t, "earnings_estimate", None)
            revenue_estimate = getattr(y_t, "revenue_estimate", None)
            upgrades_downgrades = getattr(y_t, "upgrades_downgrades", None)
            analyst_price_targets = getattr(y_t, "analyst_price_targets", None)
            eps_revisions = getattr(y_t, "eps_revisions", None)

        except Exception as e:
            logger.error(f"Failed to fetch yfinance data for {ticker}: {e}")
            per_ticker_errors.append({"ticker": ticker, "error": str(e)})
            # If yfinance fails (e.g. 404), mark as explicit 0 market cap so we don't retry endlessly in filtered scans
            try:
                md = market_data.get(comp.company_id) or CompanyMarketData(company_id=comp.company_id)
                md.market_cap = 0.0
                md.last_updated = datetime.now(timezone.utc)
                if hasattr(md, "is_delisted"):
                    md.is_delisted = True
                db.merge(md)
                
                # Also update CompanyFinancials so we don't retry immediately
                fn = financials.get(comp.company_id) or CompanyFinancials(company_id=comp.company_id)
                fn.last_updated = datetime.now(timezone.utc)
                db.merge(fn)
                
                db.commit()
            except Exception as db_exc:
                logger.error(f"Failed to mark ticker {ticker} as failed in DB: {db_exc}")
                db.rollback()
            continue  # Skip this ticker if yfinance throws an error

        try:
            # Market data upsert
            md = market_data.get(comp.company_id) or CompanyMarketData(
                company_id=comp.company_id
            )
            if is_missing_or_delisted_fast_info(fast_info):
                logger.warning(
                    f"No valid fast_info for ticker {ticker} (may be delisted or invalid)"
                )
                md.current_price = None
                md.market_cap = 0.0  # Explicitly set 0 to skip in filtered scans
                md.last_updated = datetime.now(timezone.utc)
                if hasattr(md, "is_delisted"):
                    md.is_delisted = True
                db.merge(md)
                continue

            update_market_data(md, fast_info)
            db.merge(md)

            # Financials snapshot upsert
            fn = financials.get(comp.company_id) or CompanyFinancials(
                company_id=comp.company_id
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
            db.merge(fn)

            # Build new financial history (no duplicates)
            mappings = build_financial_history_mappings(
                comp,
                income_stmt,
                balance_sheet,
                cashflow,
                fast_info,
                now,
                history_keys,
                "annual",
            )
            total_mappings += len(mappings)
            history_mappings.extend(mappings)

            # Quarterly mappings
            if include_quarterly:
                q_mappings = build_financial_history_mappings(
                    comp,
                    q_income_stmt,
                    q_balance_sheet,
                    q_cashflow,
                    fast_info,
                    now,
                    history_keys,
                    "quarterly",
                )
                total_mappings += len(q_mappings)
                history_mappings.extend(q_mappings)

            # Recommendations
            if isinstance(upgrades_downgrades, pd.DataFrame) and not upgrades_downgrades.empty:
                for idx, row in upgrades_downgrades.iterrows():
                    try:
                        action_date = (
                            idx.to_pydatetime()
                            if hasattr(idx, "to_pydatetime")
                            else datetime.strptime(str(idx), "%Y-%m-%d")
                        )
                    except Exception:
                        continue
                    key = (
                        comp.company_id,
                        action_date,
                        row.get("Firm"),
                        row.get("Action"),
                        row.get("To Grade"),
                    )
                    if key in reco_keys:
                        continue
                    reco_keys.add(key)
                    reco_mappings.append(
                        {
                            "company_id": comp.company_id,
                            "action_date": action_date,
                            "firm": row.get("Firm"),
                            "action": row.get("Action"),
                            "from_grade": row.get("From Grade"),
                            "to_grade": row.get("To Grade"),
                            "created_at": now,
                        }
                    )

            def add_estimate_rows(df: pd.DataFrame | None, est_type: str):
                if not isinstance(df, pd.DataFrame) or df.empty:
                    return
                for idx, row in df.iterrows():
                    period_label = str(idx)
                    key = (comp.company_id, est_type, period_label)
                    if key in estimate_keys:
                        continue
                    estimate_keys.add(key)
                    estimate_mappings.append(
                        {
                            "company_id": comp.company_id,
                            "estimate_type": est_type,
                            "period_label": period_label,
                            "average": row.get("avg") or row.get("Average Estimate"),
                            "low": row.get("low") or row.get("Low Estimate"),
                            "high": row.get("high") or row.get("High Estimate"),
                            "number_of_analysts": row.get("numberOfAnalysts")
                            or row.get("No. of Analysts"),
                            "year_ago": row.get("yearAgoEps")
                            or row.get("Year Ago EPS")
                            or row.get("yearAgoRevenue")
                            or row.get("Year Ago Revenue"),
                            "growth": row.get("growth") or row.get("Growth"),
                            "currency": row.get("currency") or row.get("Currency"),
                            "created_at": now,
                        }
                    )

            add_estimate_rows(earnings_estimate, "earnings")
            add_estimate_rows(revenue_estimate, "revenue")
            add_estimate_rows(analyst_price_targets, "price_target")

            # EPS revisions: store up/down counts per period_label
            if isinstance(eps_revisions, pd.DataFrame) and not eps_revisions.empty:
                idx_lookup = {str(i).strip().lower(): i for i in eps_revisions.index}
                up_row = eps_revisions.loc[idx_lookup.get("uplast7days")] if idx_lookup.get("uplast7days") in eps_revisions.index else None
                down_row = eps_revisions.loc[idx_lookup.get("downlast7days")] if idx_lookup.get("downlast7days") in eps_revisions.index else None

                for col in eps_revisions.columns:
                    up_val = None
                    down_val = None
                    if up_row is not None and col in up_row:
                        up_val = up_row[col]
                    if down_row is not None and col in down_row:
                        down_val = down_row[col]
                    key = (comp.company_id, str(col))
                    if key in eps_revision_keys:
                        continue
                    eps_revision_keys.add(key)
                    eps_revision_mappings.append(
                        {
                            "company_id": comp.company_id,
                            "period_label": str(col),
                            "revision_up": up_val,
                            "revision_down": down_val,
                            "created_at": now,
                        }
                    )

        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed while processing ticker %s", ticker)
            per_ticker_errors.append({"ticker": ticker, "error": str(exc)})
            db.rollback()
            # Mark as failed in DB so we don't retry endlessly
            try:
                md = market_data.get(comp.company_id) or CompanyMarketData(company_id=comp.company_id)
                md.market_cap = 0.0
                md.last_updated = datetime.now(timezone.utc)
                if hasattr(md, "is_delisted"):
                    md.is_delisted = True
                db.merge(md)
                db.commit()
            except Exception as db_exc:
                logger.error(f"Failed to mark ticker {ticker} as failed in DB after exception: {db_exc}")
                db.rollback()
            continue
        
        if not history_mappings and not reco_mappings and not estimate_mappings and not eps_revision_mappings:
            logger.info(f"[{comp.ticker}] No new financial data found/mapped.")
            # Important: Update last_updated so we don't retry immediately
            try:
                 fn = financials.get(comp.company_id) or CompanyFinancials(company_id=comp.company_id)
                 fn.last_updated = datetime.now(timezone.utc)
                 db.merge(fn)
                 db.commit()
            except Exception as e:
                logger.error(f"Failed to update last_updated for {comp.ticker}: {e}")
                db.rollback()
            continue

        # Sanitize numpy types on ORM objects (snapshot + market data)
        for obj in db.new.union(db.dirty):
            if hasattr(obj, "__dict__"):
                obj.__dict__.update(sanitize_numpy_types(obj.__dict__))

    db.commit()

    # Count actual inserted rows by comparing before/after count
    inserted_count = 0
    inserted_recos = 0
    inserted_estimates = 0
    inserted_eps_revisions = 0
    if history_mappings:
        history_mappings = sanitize_numpy_types(history_mappings)
        try:
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
        except IntegrityError as exc:  # noqa: BLE001
            db.rollback()
            logger.warning(
                "Duplicate financial history rows skipped for %s: %s", tickers, exc
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.exception("Bulk insert failed for financial history: %s", exc)

    if reco_mappings:
        reco_mappings = sanitize_numpy_types(reco_mappings)
        try:
            before = db.query(CompanyRecommendationHistory).count()
            db.bulk_insert_mappings(CompanyRecommendationHistory, reco_mappings)
            db.commit()
            after = db.query(CompanyRecommendationHistory).count()
            inserted_recos = after - before
            logger.info(f"Inserted {inserted_recos} recommendation rows for {tickers}")
        except IntegrityError as exc:  # noqa: BLE001
            db.rollback()
            logger.warning(
                "Duplicate recommendation rows skipped for %s: %s", tickers, exc
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.exception("Bulk insert failed for recommendations: %s", exc)

    if estimate_mappings:
        estimate_mappings = sanitize_numpy_types(estimate_mappings)
        try:
            before = db.query(CompanyEstimateHistory).count()
            db.bulk_insert_mappings(CompanyEstimateHistory, estimate_mappings)
            db.commit()
            after = db.query(CompanyEstimateHistory).count()
            inserted_estimates = after - before
            logger.info(f"Inserted {inserted_estimates} estimate rows for {tickers}")
        except IntegrityError as exc:  # noqa: BLE001
            db.rollback()
            logger.warning("Duplicate estimates skipped for %s: %s", tickers, exc)
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.exception("Bulk insert failed for estimates: %s", exc)

    if eps_revision_mappings:
        eps_revision_mappings = sanitize_numpy_types(eps_revision_mappings)
        try:
            before = db.query(CompanyEpsRevisionHistory).count()
            db.bulk_insert_mappings(CompanyEpsRevisionHistory, eps_revision_mappings)
            db.commit()
            after = db.query(CompanyEpsRevisionHistory).count()
            inserted_eps_revisions = after - before
            logger.info(f"Inserted {inserted_eps_revisions} eps revision rows for {tickers}")
        except IntegrityError as exc:  # noqa: BLE001
            db.rollback()
            logger.warning(
                "Duplicate eps revision rows skipped for %s: %s", tickers, exc
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.exception("Bulk insert failed for eps revisions: %s", exc)

    if not history_mappings:
        logger.info(
            f"No new CompanyFinancialHistory rows to insert for tickers:"
            f"{tickers} (prepared: {total_mappings})"
        )
    return {
        "status": "success",
        "inserted_history": inserted_count,
        "inserted_recommendations": inserted_recos,
        "inserted_estimates": inserted_estimates,
        "inserted_eps_revisions": inserted_eps_revisions,
        "errors": per_ticker_errors,
    }


def update_financials_for_tickers(
    db: Session,
    tickers: list[str],
    market_name: str,
    batch_size: int = 50,
    log_skips: bool = False,
    include_quarterly: bool = True,
):
    """
    For each ticker, checks latest report_end_date in DB:
    - If report_end_date is in future: skip API call.
    - If report_end_date is in past and age < (1 year - 15 days): skip API call.
    - Else: fetch and upsert new data from yfinance, batching API calls for efficiency.
    """
    logger.info("update_financials_for_tickers")

    market = get_market_by_name(db, market_name)
    if not market:
        return

    companies = get_companies_by_tickers(db, tickers)
    if not companies:
        return

    company_ids = [c.company_id for c in companies]
    latest_reports = get_latest_report_dates(db, company_ids)
    
    # Preload market data to check for "known bad" tickers (market_cap=0)
    market_data_map = {
        md.company_id: md
        for md in db.query(CompanyMarketData)
        .filter(CompanyMarketData.company_id.in_(company_ids))
        .all()
    }
    
    # Preload last update time from CompanyFinancials to avoid re-scanning valid companies same-day
    fin_updated_map = dict(
        db.query(CompanyFinancials.company_id, CompanyFinancials.last_updated)
        .filter(CompanyFinancials.company_id.in_(company_ids))
        .all()
    )

    today = datetime.now(timezone.utc).date()
    now_utc = datetime.now(timezone.utc)

    eligible_tickers = []
    for comp in companies:
        # Check if known bad/delisted (market_cap == 0 and updated recently)
        md = market_data_map.get(comp.company_id)
        if md and md.market_cap == 0:
             if md.last_updated:
                 last_up_md = md.last_updated
                 if last_up_md.tzinfo is None:
                     last_up_md = last_up_md.replace(tzinfo=timezone.utc)
                 if (now_utc - last_up_md).days < 7:
                     logger.info(f"[{comp.ticker}] Skipping known failed/delisted ticker (market_cap=0)")
                     continue
        
        # Optimization: if we already successfully updated financials TODAY, skip re-check
        # regardless of report date (prevents infinite loop for companies with old reports)
        last_fin_update = fin_updated_map.get(comp.company_id)
        if last_fin_update:
             if last_fin_update.tzinfo is None:
                 last_fin_update = last_fin_update.replace(tzinfo=timezone.utc)
             
             if last_fin_update.date() >= today:
                 logger.debug(f"[{comp.ticker}] Financials already checked today, skipping.")
                 continue

        last_map = latest_reports.get(comp.company_id, {})
        last_annual = last_map.get("annual")
        last_quarter = last_map.get("quarterly")
        if should_update_financials(last_annual, last_quarter, today):
            logger.info(
                f"[{comp.ticker}] Needs financial data update. "
                f"annual={last_annual}, quarterly={last_quarter}"
            )
            eligible_tickers.append(comp.ticker)
        else:
            if log_skips:
                if not last_annual and not last_quarter:
                    logger.info(f"[{comp.ticker}] No previous reports; will update.")
                else:
                    logger.info(
                        (
                            f"[{comp.ticker}] Last report "
                            f"(annual={last_annual}, quarterly={last_quarter}) is recent/future, "
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
            include_quarterly=include_quarterly,
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
