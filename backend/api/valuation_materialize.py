# api/valuation_materialize.py

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Dict, Iterable

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio, Transaction, TransactionType
from database.valuation import PortfolioValuationDaily
from database.company import Company
from api.valuation_preview import preview_day_value

router = APIRouter(prefix="/api/valuation", tags=["Valuation"])

class MaterializeRangeRequest(BaseModel):
    portfolio_id: int = Field(..., description="Portfolio to materialize")
    start: date = Field(..., description="Start date (YYYY-MM-DD)")
    end: date = Field(..., description="End date (YYYY-MM-DD)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"portfolio_id": 2, "start": "2025-10-22", "end": "2025-11-07"}
            ]
        }
    }


# ---------- helpers ----------

def _first_tx_date(db: Session, portfolio_id: int) -> date | None:
    dt = (
        db.query(func.min(Transaction.timestamp))
        .filter(Transaction.portfolio_id == portfolio_id)
        .scalar()
    )
    return dt.date() if dt else None


def _dec(x) -> Decimal:
    if isinstance(x, Decimal):
        return x
    try:
        return Decimal(str(x))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _same_day(ts, d: date) -> bool:
    return ts.date() == d


def _day_net_contributions(
    db: Session, portfolio_id: int, day: date, base_ccy: str
) -> Decimal:
    """
    deposits - withdrawals - fees - taxes for that *day*,
    converted to portfolio base currency using stored tx.currency_rate.
    (Transfer_in/out are internal, excluded.)
    """
    contributing_types: tuple[TransactionType, ...] = (
        TransactionType.DEPOSIT,
        TransactionType.WITHDRAWAL,
        TransactionType.FEE,
        TransactionType.TAX,
    )

    rows: Iterable[Transaction] = (
        db.query(Transaction)
        .filter(
            Transaction.portfolio_id == portfolio_id,
            # compare by day (assumes naive timestamps are portfolio-local or UTC consistently)
            and_(
                func.date(Transaction.timestamp) >= day,
                func.date(Transaction.timestamp) <= day,
            ),
            Transaction.transaction_type.in_(contributing_types),
        )
        .all()
    )

    total = Decimal("0")
    for tx in rows:
        amt = _dec(tx.quantity)  # cash amount in tx.currency
        # sign: +deposit, else negative
        if tx.transaction_type == TransactionType.DEPOSIT:
            sign = Decimal("1")
        else:
            sign = Decimal("-1")
        # convert to base ccy
        if (tx.currency or "").upper() == (base_ccy or "").upper():
            fx = Decimal("1")
        else:
            fx = _dec(tx.currency_rate) if tx.currency_rate is not None else Decimal("1")

        total += sign * amt * fx

    return total.quantize(Decimal("0.0001"))


# ---------- endpoints ----------

@router.post("/materialize-day", operation_id="valuation_materializeDay")
def materialize_day(
    portfolio_id: int,
    as_of: date,
    db: Session = Depends(get_db),
):
    # ensure portfolio exists
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    base_ccy = (pf.currency or "").upper()

    # compute preview for the day
    preview = preview_day_value(portfolio_id=portfolio_id, as_of=as_of, db=db)

    # total portfolio value (already in base ccy)
    total_value = _dec(preview.get("total", "0"))

    # cash subtotal (already in base ccy)
    by_cash = _dec(preview.get("cash", {}).get("total_base", "0"))

    # securities breakdown: bucket by company instrument_type
    lines = preview.get("securities", {}).get("lines", [])
    company_ids = [int(l["company_id"]) for l in lines] if lines else []

     # Default buckets
    bucket = {
        "stock": Decimal("0"),
        "etf": Decimal("0"),
        "bond": Decimal("0"),
        "crypto": Decimal("0"),
        "commodity": Decimal("0"),
    }

    types_map: Dict[int, str] = {}
     # If Company.instrument_type doesn't exist, just sum everything as stock.
    has_instr_type = hasattr(Company, "instrument_type")

    if company_ids and has_instr_type:
        # Build a map company_id -> instrument_type (lowercased, default 'stock')
        types_map = {
            int(cid): (itype or "stock").lower()
            for cid, itype in db.query(Company.company_id, Company.instrument_type)
                                .filter(Company.company_id.in_(company_ids))
                                .all()
        }

        for l in lines:
            cid = int(l["company_id"])
            itype = types_map.get(cid, "stock")
            val_base = _dec(l.get("value_base", "0"))
            if itype in bucket:
                bucket[itype] += val_base
            else:
                bucket["stock"] += val_base
    else:
        # No instrument_type column: everything treated as stock
        for l in lines:
            bucket["stock"] += _dec(l.get("value_base", "0"))

    by_stock = bucket["stock"].quantize(Decimal("0.0001"))
    by_etf = bucket["etf"].quantize(Decimal("0.0001"))
    by_bond = bucket["bond"].quantize(Decimal("0.0001"))
    by_crypto = bucket["crypto"].quantize(Decimal("0.0001"))
    by_commodity = bucket["commodity"].quantize(Decimal("0.0001"))

    # net external cash flows for that specific day in base ccy
    net_contributions = _day_net_contributions(db, portfolio_id, as_of, base_ccy)

    # upsert into portfolio_valuation_daily
    stmt = insert(PortfolioValuationDaily).values(
        portfolio_id=portfolio_id,
        date=as_of,
        total_value=total_value,
        by_stock=by_stock,
        by_etf=by_etf,
        by_bond=by_bond,
        by_crypto=by_crypto,
        by_commodity=by_commodity,
        by_cash=by_cash,
        net_contributions=net_contributions,
        created_at=datetime.utcnow(),
    ).on_conflict_do_update(
        index_elements=["portfolio_id", "date"],
        set_={
            "total_value": total_value,
            "by_stock": by_stock,
            "by_etf": by_etf,
            "by_bond": by_bond,
            "by_crypto": by_crypto,
            "by_commodity": by_commodity,
            "by_cash": by_cash,
            "net_contributions": net_contributions,
            # keep created_at as the original insertion time
        },
    )

    db.execute(stmt)
    db.commit()

    return {
        "message": "materialized",
        "portfolio_id": portfolio_id,
        "date": as_of.isoformat(),
        "total_value": str(total_value),
        "by_stock": str(by_stock),
        "by_etf": str(by_etf),
        "by_bond": str(by_bond),
        "by_crypto": str(by_crypto),
        "by_commodity": str(by_commodity),
        "by_cash": str(by_cash),
        "net_contributions": str(net_contributions),
    }


@router.post("/materialize-range", operation_id="valuation_materializeRange")
def materialize_range(
    portfolio_id: int,
    start: date = Query(..., description="YYYY-MM-DD"),
    end: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    if end < start:
        raise HTTPException(status_code=400, detail="end < start")

    first_dt = _first_tx_date(db, portfolio_id)
    if not first_dt:
        # no transactions at all
        return {"portfolio_id": portfolio_id, "points": []}

    cur = max(start, first_dt)
    out = []
    while cur <= end:
        res = materialize_day(portfolio_id=portfolio_id, as_of=cur, db=db)
        out.append(
            {
                "date": res["date"],
                "total_value": res["total_value"],
                "by_stock": res["by_stock"],
                "by_etf": res["by_etf"],
                "by_bond": res["by_bond"],
                "by_crypto": res["by_crypto"],
                "by_commodity": res["by_commodity"],
                "by_cash": res["by_cash"],
                "net_contributions": res["net_contributions"],
            }
        )
        cur += timedelta(days=1)

    return {"portfolio_id": portfolio_id, "points": out}

@router.post("/materialize-range-body", operation_id="valuation_materializeRangeBody")
def materialize_range_body(payload: MaterializeRangeRequest, db: Session = Depends(get_db)):
    """Materialize daily valuations for a range using a JSON body."""
    return materialize_range(
        portfolio_id=payload.portfolio_id,
        start=payload.start,
        end=payload.end,
        db=db,
    )