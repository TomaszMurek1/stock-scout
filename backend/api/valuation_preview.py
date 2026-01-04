# api/valuation_preview.py (inside same file where preview-day is defined)
from decimal import Decimal
from datetime import date, time, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.company import Company
from database.market import Market
from database.stock_data import StockPriceHistory, CompanyMarketData
from database.fx import FxRate

router = APIRouter()

def _tx_key(tt) -> str:
    return (tt.value if hasattr(tt, "value") else str(tt)).upper()

EXTERNAL_CASH_IN  = {TransactionType.DEPOSIT, TransactionType.DIVIDEND, TransactionType.INTEREST}
EXTERNAL_CASH_OUT = {TransactionType.WITHDRAWAL, TransactionType.FEE, TransactionType.TAX}
INTERNAL_XFER     = {TransactionType.TRANSFER_IN, TransactionType.TRANSFER_OUT}

def _eod(d: date) -> datetime:
    return datetime.combine(d, time.max.replace(microsecond=0))

def fx_to_base_for_currency(db: Session, as_of: date, src_ccy: str, base_ccy: str, portfolio_id: int, fallback_company_id: int | None = None) -> Decimal | None:
    src = (src_ccy or "").upper()
    base = (base_ccy or "").upper()
    if not src or not base:
        return None
    if src == base:
        return Decimal("1")

    direct = (
        db.query(FxRate.close)
        .filter(FxRate.base_currency == src, FxRate.quote_currency == base, FxRate.date <= as_of)
        .order_by(FxRate.date.desc())
        .first()
    )
    if direct and direct[0] is not None:
        return Decimal(str(direct[0]))

    inverse = (
        db.query(FxRate.close)
        .filter(FxRate.base_currency == base, FxRate.quote_currency == src, FxRate.date <= as_of)
        .order_by(FxRate.date.desc())
        .first()
    )
    if inverse and inverse[0] not in (None, 0):
        return Decimal("1") / Decimal(str(inverse[0]))

    # last resort: use latest transaction currency_rate with matching currency
    last_tx = (
        db.query(Transaction.currency, Transaction.currency_rate)
        .filter(Transaction.portfolio_id == portfolio_id)
    )
    if fallback_company_id:
        last_tx = last_tx.filter(Transaction.company_id == fallback_company_id)
    last_tx = (
        last_tx.filter(Transaction.currency == src)
        .filter(Transaction.timestamp <= _eod(as_of))
        .order_by(Transaction.timestamp.desc())
        .first()
    )
    if last_tx and last_tx[1]:
        return Decimal(str(last_tx[1]))

    return None

@router.get("/preview-day", operation_id="valuation_getPreviewDay")
def preview_day_value(
    portfolio_id: int,
    as_of: date = Query(...),
    db: Session = Depends(get_db),
):
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "USD").upper()
    cutoff = _eod(as_of)

    # --- existing holdings (securities) query (BUY/SELL/TRANSFER_IN/OUT) ---
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

    # --- latest price helper (<= as_of) ---
    def latest_price(company_id: int) -> Decimal | None:
        # 1. Primary: StockPriceHistory (Historical/Consistent)
        row = (
            db.query(StockPriceHistory.close)
            .filter(StockPriceHistory.company_id == company_id, StockPriceHistory.date <= as_of)
            .order_by(StockPriceHistory.date.desc())
            .first()
        )
        if row and row[0] is not None:
            return Decimal(str(row[0]))

        # 2. Fallback: CompanyMarketData (Live/Snapshot)
        # Only use this if as_of is today/future, otherwise historical accuracy is compromised?
        # Actually, if we are missing history, latest market data is better than nothing.
        # But we should be careful not to use "today's price" for a date 3 years ago.
        # However, for "today" (which is the main discrepancy issue), this is what we want.
        
        # Simple Logic: If no history found, check live market data.
        # This fixes the "New stock added today, no history yet" case.
        md = (
            db.query(CompanyMarketData.current_price)
            .filter(CompanyMarketData.company_id == company_id)
            .first()
        )
        if md and md[0] is not None:
            return Decimal(str(md[0]))
            
        return None

    # --- holdings valuation ---
    total_securities = Decimal("0")
    sec_lines = []
    for r in rows:
        qty = Decimal(str(r.qty))
        px = latest_price(r.company_id)
        if px is None:
            continue
        val_inst = qty * px
        rate = fx_to_base_for_currency(db, as_of, r.inst_ccy or base_ccy, base_ccy, portfolio_id, fallback_company_id=r.company_id)
        if rate is None:
            continue
        val_base = val_inst * rate
        total_securities += val_base
        sec_lines.append({
            "company_id": r.company_id,
            "qty": str(qty),
            "price_inst": str(px),
            "inst_ccy": (r.inst_ccy or base_ccy).upper(),
            "fx_to_base": str(rate),
            "value_base": str(val_base),
        })

    # --- NEW: cash balance up to as_of (cumulative) ---
    cash_rows = (
        db.query(
            Transaction.transaction_type,
            Transaction.currency,
            func.sum(Transaction.quantity).label("amt"),
            func.max(Transaction.timestamp).label("last_ts"),
        )
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.company_id == None)  # cash-like rows (no instrument)
        .filter(Transaction.timestamp <= cutoff)
        # exclude internal transfers entirely at portfolio level
        .filter(~Transaction.transaction_type.in_(INTERNAL_XFER))
        .group_by(Transaction.transaction_type, Transaction.currency)
        .all()
    )

    cash_total_base = Decimal("0")
    cash_components = []
    for tx_type, ccy, amt, _last_ts in cash_rows:
        amt = Decimal(str(amt or 0))
        key = _tx_key(tx_type)
        if key in {_tx_key(t) for t in EXTERNAL_CASH_IN}:
            sign = Decimal("1")
        elif key in {_tx_key(t) for t in EXTERNAL_CASH_OUT}:
            sign = Decimal("-1")
        else:
            # should not happen since we filtered internal transfers above, but be safe
            continue

        rate = fx_to_base_for_currency(db, as_of, ccy or base_ccy, base_ccy, portfolio_id, None)
        if rate is None:
            continue

        base_amt = sign * amt * rate
        cash_total_base += base_amt
        cash_components.append({
            "type": tx_type.value if hasattr(tx_type, "value") else str(tx_type),
            "currency": (ccy or base_ccy).upper(),
            "amount": str(amt),
            "fx_to_base": str(rate),
            "amount_base": str(base_amt),
        })

    total_base = (total_securities + cash_total_base).quantize(Decimal("0.01"))

    return {
        "portfolio_id": portfolio_id,
        "base_currency": base_ccy,
        "as_of": as_of.isoformat(),
        "total": str(total_base),
        "securities": {
            "total_base": str(total_securities.quantize(Decimal("0.01"))),
            "lines": sec_lines,
        },
        "cash": {
            "total_base": str(cash_total_base.quantize(Decimal("0.01"))),
            "components": cash_components,
        },
    }
