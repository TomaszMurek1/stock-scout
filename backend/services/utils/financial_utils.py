def calculate_financial_ratios(financials):
    revenue = financials.total_revenue or 0
    net_income = financials.net_income or 0
    gross_profit = financials.gross_profit or 0
    operating_income = financials.operating_income or 0

    return {
        "gross_margin": gross_profit / revenue if revenue else None,
        "operating_margin": operating_income / revenue if revenue else None,
        "net_margin": net_income / revenue if revenue else None,
        # These are optional if you don’t have total assets or equity available:
        "return_on_equity": None,
        "return_on_assets": None,
    }