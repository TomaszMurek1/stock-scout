from datetime import datetime, date, time
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from database.base import get_db
from database.portfolio import Transaction
from database.company import Company
from database.market import Market
from schemas.portfolio_schemas import TransactionType

router = APIRouter(prefix="/api/valuation/debug", tags=["valuation-debug"])

def _eod(d: date) -> datetime:
    return datetime.combine(d, time.max.replace(microsecond=0))

@router.get("/holdings")
def debug_holdings(portfolio_id: int, as_of: date, db: Session = Depends(get_db)):
    cutoff = _eod(as_of)
    qty_expr = func.coalesce(
        func.sum(
            case(
                (Transaction.transaction_type == TransactionType.BUY,  Transaction.quantity),
                (Transaction.transaction_type == TransactionType.SELL, -Transaction.quantity),
                else_=0,
            )
        ),
        0,
    )
    rows = (
        db.query(
            Transaction.company_id.label("company_id"),
            qty_expr.label("qty"),
            Market.currency.label("inst_ccy"),
        )
        .join(Company, Company.company_id == Transaction.company_id)
        .join(Market, Market.market_id == Company.market_id)
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.timestamp <= cutoff)
        .group_by(Transaction.company_id, Market.currency)
        .having(qty_expr != 0)
        .all()
    )
    return [
        {"company_id": r.company_id, "qty": str(r.qty), "inst_ccy": (r.inst_ccy or "").upper()}
        for r in rows
    ]
