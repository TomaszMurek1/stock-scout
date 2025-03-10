from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from database.models import Company, CompanyFinancialHistory


def find_companies_with_break_even(db: Session, months: int = 12):
    """
    Identifies companies whose net income crossed zero within the last N months (12 or 24).
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)

    # Fetch financial history within the last N months
    financial_data = (
        db.query(CompanyFinancialHistory, Company)
        .join(Company)
        .filter(CompanyFinancialHistory.quarter_end_date >= cutoff_date)
        .order_by(CompanyFinancialHistory.company_id, CompanyFinancialHistory.quarter_end_date)
        .all()
    )

    break_even_companies = []
    
    # Group financial data by company
    company_financials = {}
    for record, company in financial_data:
        if company.company_id not in company_financials:
            company_financials[company.company_id] = {
                "company": company,
                "history": [],
            }
        company_financials[company.company_id]["history"].append(record)

    # Check for break-even points
    for company_id, data in company_financials.items():
        history = data["history"]
        prev_net_income = None

        for record in history:
            if prev_net_income is not None:
                if (prev_net_income < 0 and record.net_income >= 0) or (prev_net_income >= 0 and record.net_income < 0):
                    break_even_companies.append({
                        "ticker": data["company"].ticker,
                        "company_name": data["company"].name,
                        "break_even_date": record.quarter_end_date.isoformat(),
                        "previous_net_income": prev_net_income,
                        "current_net_income": record.net_income,
                    })
                    break  # We found a break-even, no need to check further

            prev_net_income = record.net_income  # Store for next comparison

    return break_even_companies
