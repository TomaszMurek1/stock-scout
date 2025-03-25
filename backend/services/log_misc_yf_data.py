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
        logging.info(f"\nEarnings:\n{yticker.earnings}")
        logging.info(f"\nQuarterly Earnings:\n{yticker.quarterly_earnings}")
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

if __name__ == "__main__":
    print_yfinance_summary("SOFI")
