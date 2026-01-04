
import os
import sys
import pandas as pd
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Add backend to path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models to ensure SQLAlchemy can resolve relationships
from database import *
from database.alert import Alert # specifically import Alert if not in __init__
from database.base import SessionLocal, engine
from database.portfolio import Transaction, Portfolio
from database.company import Company
from schemas.portfolio_schemas import TransactionType
from api.positions_service import apply_transaction_to_position
from services.valuation.rematerializ import rematerialize_from_tx

# Configuration
PORTFOLIO_ID = 4
ACCOUNT_ID = 3
EXCEL_PATH = os.getenv('EXCEL_PATH', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'account_50292032_pl_xlsx_2005-12-31_2026-01-03.xlsx'))

# Mapping for tickers that differ in DB
TICKER_MAP = {
    'TSLA.DE': 'TL0.DE',
    'SVE.PL': 'SVE.WA',
    'UNH.US': 'UNH',
    'NU.US': 'NU',
    'AMD.DE': 'AMD',
    'TSLA.US': 'TSLA',
}

TYPE_MAP = {
    'deposit': TransactionType.DEPOSIT,
    'transfer': TransactionType.DEPOSIT,
    'Stock purchase': TransactionType.BUY,
    'DIVIDENT': TransactionType.DIVIDEND,
    'Withholding Tax': TransactionType.TAX,
    'Free-funds Interest': TransactionType.INTEREST,
    'Free-funds Interest Tax': TransactionType.TAX,
}

def parse_buy_comment(comment):
    # Format: OPEN BUY 1 @ 309.60 or OPEN BUY 3 @ 99.220
    try:
        parts = comment.split()
        qty = float(parts[2])
        price = float(parts[4])
        return qty, price
    except:
        return None, None

def get_company_id(db: Session, symbol):
    if not symbol or pd.isna(symbol):
        return None
    ticker = TICKER_MAP.get(symbol, symbol)
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        # Try without suffix
        clean_ticker = symbol.split('.')[0]
        company = db.query(Company).filter(Company.ticker == clean_ticker).first()
    
    return company.company_id if company else None

def import_transactions():
    db = SessionLocal()
    try:
        # Get user_id
        portfolio = db.query(Portfolio).filter(Portfolio.id == PORTFOLIO_ID).first()
        if not portfolio:
            print(f"Portfolio {PORTFOLIO_ID} not found")
            return
        user_id = portfolio.user_id

        print(f"Importing for User: {user_id}, Portfolio: {PORTFOLIO_ID}, Account: {ACCOUNT_ID}")

        df = pd.read_excel(EXCEL_PATH, sheet_name='CASH OPERATION HISTORY', skiprows=10)
        
        # Sort by time ascending to process chronologically
        df = df.sort_values('Time')

        count = 0
        for _, row in df.iterrows():
            if pd.isna(row['ID']) or row['ID'] == 'Total':
                continue
            
            raw_type = row['Type']
            if raw_type not in TYPE_MAP:
                print(f"Skipping unknown type: {raw_type} (ID: {row['ID']})")
                continue
            
            tx_type = TYPE_MAP[raw_type]
            timestamp = row['Time']
            amount_pln = float(row['Amount'])
            symbol = row['Symbol']
            comment = str(row['Comment'])
            
            qty = 0
            price = 0
            currency = 'PLN'
            currency_rate = 1.0
            company_id = None
            
            if tx_type == TransactionType.BUY:
                qty_val, price_val = parse_buy_comment(comment)
                if qty_val is None:
                    print(f"Could not parse BUY comment: {comment}")
                    continue
                qty = qty_val
                price = price_val
                company_id = get_company_id(db, symbol)
                if not company_id:
                    print(f"Warning: Company not found for {symbol}")
                
                # Determine currency from symbol
                if symbol.endswith('.US'):
                    currency = 'USD'
                elif symbol.endswith('.DE'):
                    currency = 'EUR'
                elif symbol.endswith('.PL'):
                    currency = 'PLN'
                
                total_value_pln = abs(amount_pln)
                
                # Calculate implied rate
                if currency != 'PLN':
                    currency_rate = total_value_pln / (qty * price)
                else:
                    currency_rate = 1.0

            elif tx_type in [TransactionType.DIVIDEND, TransactionType.TAX]:
                company_id = get_company_id(db, symbol)
                price = 0
                total_value_pln = abs(amount_pln)
                # Correctly set quantity to the cash amount for these types so metrics work
                qty = total_value_pln
                currency = 'PLN'
                currency_rate = 1.0

            elif tx_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                total_value_pln = abs(amount_pln)
                # Correctly set quantity to the cash amount for these types so metrics work
                qty = total_value_pln
                
                currency = 'PLN'
                currency_rate = 1.0

            # Create Transaction
            tx = Transaction(
                user_id=user_id,
                portfolio_id=PORTFOLIO_ID,
                account_id=ACCOUNT_ID,
                company_id=company_id,
                transaction_type=tx_type,
                quantity=Decimal(str(qty)),
                price=Decimal(str(price)),
                fee=Decimal("0"),
                total_value=Decimal(str(total_value_pln)),
                currency=currency,
                currency_rate=Decimal(str(currency_rate)),
                timestamp=timestamp,
                note=f"Imported from Excel ID: {row['ID']}. Comment: {comment}"
            )
            
            db.add(tx)
            db.flush()
            
            # Apply to position
            apply_transaction_to_position(db, tx)
            count += 1

        db.commit()
        print("Zeroes fixed.")

        # 4. Sync Account Cash
        from api.positions_service import recompute_account_cash
        recompute_account_cash(db, ACCOUNT_ID)
        db.commit()
        print(f"Account {ACCOUNT_ID} cash recomputed.")
        print(f"Successfully imported {count} transactions.")
        
        # Rematerialize
        rematerialize_from_tx(db, PORTFOLIO_ID, datetime.now().date())
        print("Portfolio rematerialized.")

    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import_transactions()
