from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database.models import Company, CompanyFinancialHistory, Market

def find_companies_with_break_even(db: Session, months: int, company_ids: list[int]):
    """
    Identifies companies whose net income crossed zero within the last N months (12 or 24),
    but only for the companies provided in company_ids.
    Now includes the currency from the Market table.
    """
    if not company_ids:
        return []  # If no companies provided, return empty list

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=months * 30)

    # Fetch financial history for the given companies within the last N months
    financial_data = (
        db.query(CompanyFinancialHistory, Company, Market.currency)
        .join(Company)
        .join(Market)  # Ensure we also join Market to fetch currency
        .filter(CompanyFinancialHistory.company_id.in_(company_ids))  # Only selected companies
        .filter(CompanyFinancialHistory.quarter_end_date >= cutoff_date)
        .order_by(CompanyFinancialHistory.company_id, CompanyFinancialHistory.quarter_end_date)
        .all()
    )

    break_even_companies = []
    
    # Group financial data by company
    company_financials = {}
    for record, company, currency in financial_data:
        if company.company_id not in company_financials:
            company_financials[company.company_id] = {
                "company": company,
                "currency": currency,
                "history": [],
            }
        company_financials[company.company_id]["history"].append(record)

    # Check for break-even points
    for company_id, data in company_financials.items():
        history = data["history"]
        prev_net_income = None

        for record in history:
            if prev_net_income is not None:
                if (prev_net_income <= 0 and record.net_income > 0):
                    break_even_companies.append({
                        "ticker": data["company"].ticker,
                        "company_name": data["company"].name,
                        "break_even_date": record.quarter_end_date.isoformat(),
                        "previous_net_income": prev_net_income,
                        "current_net_income": record.net_income,
                        "currency": data["currency"],
                    })
                    break

            prev_net_income = record.net_income

    return break_even_companies