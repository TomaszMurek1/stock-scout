import os
import yfinance as yf
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(message)s")

def print_yfinance_summary(ticker: str):
    logging.info(f"\n==============================")
    logging.info(f"📊 YFinance Summary for {ticker}")
    logging.info(f"==============================")

    yticker = yf.Ticker(ticker)

    # SECTION: Basic Information
    logging.info("\n🔹 Basic Information")
    try:
        fast_info = yticker.fast_info
        info = yticker.info
        logging.info(f"Fast Info: {fast_info}")
        logging.info(f"General Info (deprecated): {info.get('longName', 'N/A')} - {info.get('sector', 'N/A')} ({info.get('industry', 'N/A')})")
    except Exception as e:
        logging.error(f"Error fetching basic info: {e}")

    try:
        hist = yticker.history(period="1mo")
        logging.info(f"\n1-month History (last 5 rows):\n{hist.tail()}")
    except Exception as e:
        logging.error(f"Error fetching 1-month history: {e}")

    try:
        logging.info(f"\nDividends:\n{yticker.dividends.tail()}")
        logging.info(f"\nSplits:\n{yticker.splits.tail()}")
        logging.info(f"\nShares Outstanding:\n{yticker.shares.tail()}")
        logging.info(f"\nCorporate Actions:\n{yticker.actions.tail()}")
    except Exception as e:
        logging.error(f"Error fetching dividends/splits/shares: {e}")

    try:
        recs = yticker.recommendations
        logging.info(f"\nAnalyst Recommendations (last 5):\n{recs.tail()}")
    except Exception as e:
        logging.error(f"Error fetching recommendations: {e}")

    # SECTION: Price & Market Data
    logging.info("\n🔹 Price & Market Data")
    try:
        hist5d = yticker.history(period="5d")
        logging.info(f"\n5-day History:\n{hist5d}")
        logging.info(f"Last Price: {yticker.fast_info.get('last_price', 'N/A')}")
        logging.info(f"Market Cap: {yticker.fast_info.get('market_cap', 'N/A')}")
        logging.info(f"Volume: {yticker.fast_info.get('volume', 'N/A')}")
    except Exception as e:
        logging.error(f"Error fetching price/market data: {e}")

    # SECTION: Financial Statements
    logging.info("\n🔹 Financial Statements")
    try:
        logging.info(f"\nIncome Statement:\n{yticker.financials}")
        logging.info(f"\nBalance Sheet:\n{yticker.balance_sheet}")
        logging.info(f"\nCash Flow Statement:\n{yticker.cashflow}")
        # logging.info(f"\nEarnings:\n{yticker.earnings}")
        # logging.info(f"\nQuarterly Earnings:\n{yticker.quarterly_earnings}")
    except Exception as e:
        logging.error(f"Error fetching financial statements: {e}")

    # SECTION: Options Data
    logging.info("\n🔹 Options Data")
    try:
        if yticker.options:
            logging.info(f"Available Expiration Dates: {yticker.options}")
            opt_date = yticker.options[0]
            option_chain = yticker.option_chain(opt_date)
            logging.info(f"Option Chain for {opt_date}:\nCalls:\n{option_chain.calls.head()}\nPuts:\n{option_chain.puts.head()}")
        else:
            logging.info("No options data available.")
    except Exception as e:
        logging.error(f"Error fetching options data: {e}")

    # SECTION: Company Info
    logging.info("\n🔹 Company Information")
    try:
        logging.info(f"\nEarnings Calendar:\n{yticker.calendar}")
        logging.info(f"\nMajor Holders:\n{yticker.major_holders}")
        logging.info(f"\nInstitutional Holders:\n{yticker.institutional_holders.head()}")
        logging.info(f"\nMutual Fund Holders:\n{yticker.mutualfund_holders.head()}")
        logging.info(f"\nSustainability (ESG):\n{yticker.sustainability}")
    except Exception as e:
        logging.error(f"Error fetching company info: {e}")

    # SECTION: Miscellaneous
    logging.info("\n🔹 Miscellaneous")
    try:
        logging.info(f"ISIN: {yticker.isin}")
        logging.info(f"\nRecommendations Summary:\n{yticker.recommendations_summary}")
    except Exception as e:
        logging.error(f"Error fetching recommendations summary: {e}")

    try:
        upgrades = yticker.upgrades_downgrades
        if isinstance(upgrades, pd.DataFrame) and not upgrades.empty:
            logging.info(f"\nUpgrades/Downgrades:\n{upgrades.tail()}")
        else:
            logging.info("No upgrades/downgrades data available.")
    except Exception as e:
        logging.error(f"Error fetching upgrades/downgrades: {e}")

    try:
        news = yticker.news
        if news:
            logging.info(f"\nRecent News:")
            for article in news[:5]:
                title = article.get("title")
                link = article.get("link")
                if title and link:
                    logging.info(f"- {title}")
                    logging.info(f"  {link}")
        else:
            logging.info("No news available.")
    except Exception as e:
        logging.error(f"Error fetching news: {e}")



def print_financial_statements(ticker: str):
    pd.set_option("display.max_rows", None)  # Show all rows
    pd.set_option("display.max_columns", None)  # Show all columns (if needed)
    pd.set_option("display.width", 1000)  # Avoid line wrapping
    pd.set_option("display.colheader_justify", "right")
    logging.info(f"\n==============================")
    logging.info(f"📊 YFinance Summary for {ticker}")
    logging.info(f"==============================")

    yticker = yf.Ticker(ticker)

   

    # SECTION: Financial Statements
    logging.info("\n🔹 Financial Statements")
    try:
        logging.info(f"\nIncome Statement:\n{yticker.financials}")
        logging.info(f"\nBalance Sheet:\n{yticker.balance_sheet}")
        logging.info(f"\nCash Flow Statement:\n{yticker.cashflow}")
        # logging.info(f"\nEarnings:\n{yticker.earnings}")
        # logging.info(f"\nQuarterly Earnings:\n{yticker.quarterly_earnings}")
    except Exception as e:
        logging.error(f"Error fetching financial statements: {e}")

   
def print_fast_info(ticker: str):
    logging.info(f"\n==============================")
    logging.info(f"📊 YFinance fast info for {ticker}")
    logging.info(f"==============================")

    yticker = yf.Ticker(ticker)

    fast_info = yticker.fast_info

    # SECTION: Financial Statements
    logging.info(f"Fast Info: {fast_info}")
    logging.info(f"Fast Info: {fast_info['shares']}")
   
def save_all_financial_data_to_excel(ticker: str, output_dir="financial_data"):
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{ticker}_financial_data.xlsx")

    yticker = yf.Ticker(ticker)

    try:
        income_statement = yticker.financials
        balance_sheet = yticker.balance_sheet
        cash_flow = yticker.cashflow
        fast_info = pd.DataFrame([yticker.fast_info])

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            if not income_statement.empty:
                income_statement.to_excel(writer, sheet_name="Income Statement")
            if not balance_sheet.empty:
                balance_sheet.to_excel(writer, sheet_name="Balance Sheet")
            if not cash_flow.empty:
                cash_flow.to_excel(writer, sheet_name="Cash Flow")
            if not fast_info.empty:
                fast_info.to_excel(writer, sheet_name="Fast Info", index=False)

        print(f"✅ All financial data for {ticker} saved in '{output_path}'")
    except Exception as e:
        print(f"❌ Error fetching or saving data for {ticker}: {e}")


def save_all_financial_data_to_excel(ticker: str, output_dir="financial_data"):
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{ticker}_financial_data.xlsx")

    yticker = yf.Ticker(ticker)

    try:
        # Get financials safely
        income_statement = yticker.financials if yticker.financials is not None else pd.DataFrame()
        balance_sheet = yticker.balance_sheet if yticker.balance_sheet is not None else pd.DataFrame()
        cash_flow = yticker.cashflow if yticker.cashflow is not None else pd.DataFrame()
        fast_info = yticker.fast_info if yticker.fast_info is not None else {}

        # Convert fast_info dictionary to a two-column DataFrame
        fast_info_df = pd.DataFrame({
            "Metric": list(fast_info.keys()),
            "Value": list(fast_info.values())
        })

        print(f"Income Statement shape: {income_statement.shape}")
        print(f"Balance Sheet shape: {balance_sheet.shape}")
        print(f"Cash Flow shape: {cash_flow.shape}")
        print(f"Fast Info shape: {fast_info_df.shape}")

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            income_statement.to_excel(writer, sheet_name="Income Statement")
            balance_sheet.to_excel(writer, sheet_name="Balance Sheet")
            cash_flow.to_excel(writer, sheet_name="Cash Flow")
            fast_info_df.to_excel(writer, sheet_name="Fast Info", index=False)

        print(f"✅ All financial data for {ticker} saved in '{output_path}'")
    except Exception as e:
        print(f"❌ Error fetching or saving data for {ticker}: {e}")

if __name__ == "__main__":
    print_financial_statements("ALE.WA")
    save_all_financial_data_to_excel("ALE.WA")
