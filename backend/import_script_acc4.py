
import os
import sys
import pandas as pd
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Add backend to path so we can import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import all models to ensure SQLAlchemy can resolve relationships
from database import *
from database.alert import Alert # specifically import Alert if not in __init__
from database.base import SessionLocal, engine
from database.portfolio import Transaction, Portfolio
from database.company import Company
from schemas.portfolio_schemas import TransactionType
from api.positions_service import apply_transaction_to_position, recompute_account_cash
from services.valuation.rematerializ import rematerialize_from_tx

# Configuration
PORTFOLIO_ID = 4
ACCOUNT_ID = 4
EXCEL_PATH = '/home/tm/Projekty/stock-scout/backend/account_50315402_pl_xlsx_2005-12-31_2026-01-03.xlsx'

# Mapping for tickers that differ in DB
TICKER_MAP = {
    'TSLA.DE': 'TL0.DE',
    'SVE.PL': 'SVE.WA',
    'UNH.US': 'UNH',
    'NU.US': 'NU',
    'AMD.DE': 'AMD',
    'TSLA.US': 'TSLA',
    'GRAB.US': 'GRAB',
    'ASML.DE': 'ASML.AS', 
}

TYPE_MAP = {
    'deposit': TransactionType.DEPOSIT,
    'transfer': TransactionType.DEPOSIT,
    'Stock purchase': TransactionType.BUY,
    'Stock sale': TransactionType.SELL,
    'DIVIDENT': TransactionType.DIVIDEND,
    'Withholding Tax': TransactionType.TAX,
    'Free-funds Interest': TransactionType.INTEREST,
    'Free-funds Interest Tax': TransactionType.TAX,
}

def parse_buy_comment(comment):
    # Format: OPEN BUY 1 @ 309.60 or OPEN BUY 3 @ 99.220
    # Also works for: CLOSE BUY 0.5 @ 100.0 (Closing long)
    # Also works for: OPEN SELL 1 @ 50.0 (Opening short)
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
    # Special override for ASML to force correct entity
    if ticker in ['ASML.AS', 'ASML', 'ASML.NL']:
        return 3448

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
            symbol = str(row['Symbol']).strip()
            comment = str(row['Comment'])
            
            if 'ASML' in symbol:
                print(f"DEBUG: Found ASML symbol: '{symbol}'")
            
            qty = 0
            price = 0
            currency = 'PLN'
            currency_rate = 1.0
            company_id = None
            
            if tx_type == TransactionType.BUY:
                qty_val, price_val = parse_buy_comment(comment)
                if qty_val:
                    qty = qty_val
                    price = price_val
                
                company_id = get_company_id(db, symbol)
                
                # Determine currency from symbol
                if symbol and (symbol.endswith('.US') or symbol in ['UNH', 'NU', 'TSLA', 'GRAB.US', 'GRAB']):
                     currency = 'USD'
                elif symbol and symbol.endswith('.DE'):
                     currency = 'EUR'
                # Explicit override for ASML to EUR
                elif symbol and (symbol in ['ASML', 'ASML.AS', 'ASML.DE', 'ASML.NL'] or company_id == 3448):
                     currency = 'EUR'
                elif symbol and symbol.endswith('.PL'):
                     currency = 'PLN'
                
                total_value_pln = abs(amount_pln)
                
                if currency != 'PLN' and qty and price:
                    currency_rate = total_value_pln / (qty * price)
                else:
                    currency_rate = 1.0

            elif tx_type == TransactionType.SELL:
                 company_id = get_company_id(db, symbol)
                 total_value_pln = abs(amount_pln)
                 
                 # PARSE QUANTITY FOR SELL TOO!
                 qty_val, price_val = parse_buy_comment(comment)
                 if qty_val:
                     qty = qty_val
                     price = price_val

                 # Determine currency from symbol (same logic as BUY)
                 if symbol and (symbol.endswith('.US') or symbol in ['UNH', 'NU', 'TSLA', 'GRAB.US', 'GRAB']):
                     currency = 'USD'
                 elif symbol and symbol.endswith('.DE'):
                     currency = 'EUR'
                 # Explicit override for ASML to EUR
                 elif symbol and (symbol in ['ASML', 'ASML.AS', 'ASML.DE', 'ASML.NL'] or company_id == 3448):
                     currency = 'EUR'
                 elif symbol and symbol.endswith('.PL'):
                     currency = 'PLN'

                 if currency != 'PLN' and qty and price:
                    currency_rate = total_value_pln / (qty * price)
                 else:
                    currency_rate = 1.0


            elif tx_type in [TransactionType.DIVIDEND, TransactionType.TAX]:
                company_id = get_company_id(db, symbol)
                price = 0
                total_value_pln = abs(amount_pln)
                qty = total_value_pln
                currency = 'PLN'
                currency_rate = 1.0

            elif tx_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                total_value_pln = abs(amount_pln)
                qty = total_value_pln
                currency = 'PLN'
                currency_rate = 1.0

            if tx_type in [TransactionType.BUY, TransactionType.SELL] and not company_id:
                print(f"Skipping {tx_type} for {symbol} (ID: {row['ID']}) - Company not found")
                continue

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
                total_value=Decimal(str(abs(amount_pln))),
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
        print("Import done.")

        # 4. Sync Account Cash
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
