import yfinance as yf
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database.models import Company, HistoricalData, Market
import logging
import inspect

def fetch_and_save_stock_data(ticker: str, start_date: datetime, end_date: datetime, db: Session):
    try:
        # Check if the company exists in the database
        company = db.query(Company).filter(Company.ticker == ticker).first()
        
        if not company:
            print(f"Company with ticker {ticker} not found in the database. Fetching from yfinance.")
            
            # Fetch data from yfinance
            stock = yf.Ticker(ticker)
            print('stock', stock.info)
            
            # Check if the market exists, if not create it
            exchange_name = stock.info['exchange']
            market = db.query(Market).filter(Market.name == exchange_name).first()
            if not market:
                market = Market(name=exchange_name, country=stock.info['country'], currency=stock.info['currency'], timezone=stock.info['timeZoneFullName'])
                db.add(market)
                db.commit()
                print(f"Created new market entry for exchange {exchange_name}.")
            
            # Create new company entry with the correct market_id
            company = Company(
                name=stock.info['longName'],
                ticker=ticker,
                market_id=market.market_id,
                sector=stock.info.get('sector', 'Unknown'),
                industry=stock.info.get('industry', 'Unknown')
            )
            db.add(company)
            db.commit()
            print(f"Created new company entry for ticker {ticker}.")
        else:
            print(f"Company with ticker {ticker} found in the database. Fetching from yfinance.")
            
            # Fetch data from yfinance
            stock = yf.Ticker(ticker)

        # Fetch historical data
        df = stock.history(start=start_date, end=end_date)
        
        if df.empty:
            logging.warning(f"No data returned from yfinance for ticker {ticker}.")
            return None

        # Save historical data to the database
        for index, row in df.iterrows():
            historical_data = HistoricalData(
                company_id=company.company_id,
                date=index.date(),
                open=row['Open'],
                high=row['High'],
                low=row['Low'],
                close=row['Close'],
                adjusted_close=row.get('Adj Close', row['Close']),
                volume=row['Volume']
            )
            db.add(historical_data)
        
        db.commit()
        print(f"Data for {ticker} fetched and saved successfully.")
    except Exception as e:
        db.rollback()
        logging.error(f"Unexpected error fetching data for {ticker}: {str(e)}")
        return None

# Example usage
if __name__ == "__main__":
    ticker = "AAPL"
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)  # Fetch last 30 days of data
    fetch_and_save_stock_data(ticker, start_date, end_date)
