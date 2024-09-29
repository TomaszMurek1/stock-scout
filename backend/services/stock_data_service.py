import yfinance as yf
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, IntegrityError
from backend.database.models import Company, HistoricalData, Market
import logging
import inspect
import pandas as pd
import time

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def retry_on_db_lock(func):
    def wrapper(*args, **kwargs):
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if "database is locked" in str(e) and attempt < max_attempts - 1:
                    logger.warning(f"Database locked. Retrying in {2**attempt} seconds...")
                    time.sleep(2**attempt)
                else:
                    raise
    return wrapper

@retry_on_db_lock
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
        # Check if data already exists in historical_data
        # Get the existing data dates
        existing_dates = set(db.query(HistoricalData.date).filter(
            HistoricalData.company_id == company.company_id,
            HistoricalData.date >= start_date,
            HistoricalData.date <= end_date
        ).all())

        # Calculate missing dates
        all_dates = set(pd.date_range(start=start_date, end=end_date).date)
        missing_dates = all_dates - existing_dates

        if not missing_dates:
            message = f"All data for {ticker} from {start_date.date()} to {end_date.date()} already exists in the database."
            print(message)
            return {"status": "up_to_date", "message": message}

        # Fetch historical data only for missing dates
        missing_start = min(missing_dates)
        missing_end = max(missing_dates)
        stock_data = yf.Ticker(ticker).history(start=missing_start, end=missing_end)
        
        logger.debug(f"Filtered data shape: {stock_data.shape}")

        if stock_data.empty:
            logging.warning(f"No new data to save for ticker {ticker}.")
            return None

        # Save historical data to the database
        records_added = 0
        for index, row in stock_data.iterrows():
            historical_data = HistoricalData(
                company_id=company.company_id,
                date=index.date(),
                open=row['Open'],
                high=row['High'],
                low=row['Low'],
                close=row['Close'],
                adjusted_close=row.get('Adj Close', row['Close']),
                volume=int(row['Volume'])  # Convert to int to avoid numpy type issues
            )
            try:
                db.add(historical_data)
                db.flush()  # This will attempt to insert the record without committing
                records_added += 1
            except IntegrityError:
                db.rollback()  # Roll back the failed insertion
                logger.warning(f"Record for date {index.date()} already exists. Skipping.")
                continue
        
        if records_added > 0:
            db.commit() 
            message = f"Data for {ticker} fetched and saved successfully. {records_added} new records added."
            print(message)
            return {"status": "success", "message": message}
        else:
            message = f"No new records added for {ticker}."
            print(message)
            return {"status": "Up to date", "message": message}

    except Exception as e:
        db.rollback()
        logging.error(f"Unexpected error fetching data for {ticker}: {str(e)}", exc_info=True)
        raise

# Example usage
if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine('sqlite:///your_database.db')
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    ticker = "AAPL"
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)  # Fetch last 30 days of data
    
    with SessionLocal() as db:
        fetch_and_save_stock_data(ticker, start_date, end_date, db)
