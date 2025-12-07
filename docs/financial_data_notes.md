# Financial Data Notes and Discrepancies

This document aims to capture insights and explanations regarding financial data extraction and potential discrepancies observed across different platforms or specific company types.

---

## SOFI Revenue Discrepancy (yfinance vs. TradingView)

**Observation:** Revenue figures for SoFi Technologies (SOFI) can differ significantly between data sources like yfinance (used in this project) and TradingView for the same reporting periods.

**Explanation:** The discrepancy primarily arises from how "revenue" is defined and reported for **financial institutions (Banks/Fintechs)** like SoFi.

*   **yfinance (and SoFi's GAAP reports):** Typically presents **"Net Revenue"**. This is the standard metric for financial companies and is calculated as:
    `Net Revenue = (Interest Income - Interest Expense) + Non-Interest Income`
    In essence, it reflects the income generated after accounting for the cost of funds (interest paid to depositors/lenders).

*   **TradingView (and similar platforms, for some contexts):** May present **"Total Revenue" (Gross Revenue)**. This often represents the sum of all income streams before deducting interest expenses:
    `Gross Revenue = Interest Income + Non-Interest Income`
    This approach can be misleading for financial institutions as it doesn't account for a significant operating cost (interest expense).

**Example (based on 2024 data, approximate):**

| Metric                  | Value (Approx.)      | Description                                                                                                                                           |
| :---------------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **yfinance Revenue**    | ~$2.61 Billion       | SoFi's reported Net Revenue (reflecting income after interest expense).                                                                               |
| **Interest Expense**    | ~$1.09 Billion       | The cost SoFi paid in interest during the period.                                                                                                       |
| **TradingView Revenue** | **~$3.70 Billion**   | Likely representing Gross Revenue (Net Revenue + Interest Expense), which is roughly $2.61 Billion + $1.09 Billion.                                     |

**Conclusion:**
yfinance provides the **Net Revenue**, which is generally considered the more relevant and accurate "sales" equivalent for banking and fintech stocks as it reflects the company's performance after its primary cost of doing business (interest expense). Gross Revenue, while seemingly higher, can be a less informative figure for this sector.

---

## Missing Current Assets/Liabilities for Financial Institutions

**Observation:** For certain financial institutions (like SOFI), fields such as `current_assets`, `current_liabilities`, and consequently `working_capital` might be consistently `null` or missing in yfinance data.

**Explanation:** Financial reporting standards for banks and other financial services companies differ significantly from those for traditional manufacturing or service companies.

*   **Classification:** Banks typically do not classify their assets and liabilities into "current" and "non-current" categories in the same manner. Loans, deposits, and other financial instruments are their primary assets and liabilities, and these are often presented without a strict one-year maturity distinction.
*   **Data Providers:** Data aggregators like yfinance receive and process financial statements as they are reported. If a company's official statements do not delineate current vs. non-current categories, these fields will not be available in the aggregated data.
*   **Working Capital:** Since `working_capital` is calculated as `current_assets - current_liabilities`, if the base components are missing, the derived metric will also be `null`.

**Implication:** For these types of companies, the absence of `current_assets`, `current_liabilities`, and `working_capital` is expected and not necessarily an indication of missing data or a parsing error. Other metrics, such as `total_assets`, `total_liabilities`, and capital ratios, are more relevant for analyzing financial institutions.

---

## NVDA (and Tech Sector) EBIT/EBITDA Discrepancies

**Observation:** EBIT and EBITDA figures for technology companies like Nvidia (NVDA) often differ between yfinance and TradingView.

**Explanation:** The primary driver is the treatment of **Stock-Based Compensation (SBC)** and other Non-GAAP adjustments.

*   **yfinance (Standardized/GAAP):** Typically calculates EBITDA based on **GAAP Operating Income**.
    *   *Formula:* `GAAP Operating Income + Depreciation & Amortization`
    *   *Impact:* SBC is treated as a real expense, resulting in a **lower** EBITDA.

*   **TradingView (Adjusted/Non-GAAP):** Often aligns with the company's "Adjusted" or "Non-GAAP" reporting, which excludes SBC and acquisition-related costs.
    *   *Formula:* `Non-GAAP Operating Income + Depreciation & Amortization`
    *   *Impact:* SBC is added back (or not subtracted), resulting in a **higher** EBITDA.

**Example (Nvidia FY2024 Approx):**
*   **GAAP Operating Income:** ~$33.0B (yfinance base)
*   **Non-GAAP Operating Income:** ~$37.1B (TradingView base)
*   **Difference:** ~$4.1B (primarily Stock-Based Compensation).

**Conclusion:**
When analyzing tech companies with significant SBC, be aware that yfinance tends to be more conservative (GAAP-aligned), while TradingView may present "Adjusted" figures that paint a more favorable picture of operating cash flow potential.
