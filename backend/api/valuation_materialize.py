# api/valuation_materialize.py
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from database.base import get_db
from database.portfolio import Portfolio
from database.valuation import PortfolioValuationDaily  # your existing model
from api.valuation_preview import preview_day_value     # reuse the working calc

router = APIRouter(prefix="/api/valuation", tags=["valuation"])

@router.post("/materialize-day")
def materialize_day(portfolio_id: int, as_of: date, db: Session = Depends(get_db)):
    # make sure portfolio exists (and get its base ccy if you ever need it)
    pf = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # compute total using your preview logic
    preview = preview_day_value(portfolio_id=portfolio_id, as_of=as_of, db=db)

    # parse decimal safely
    try:
        total = Decimal(preview["total"])
    except Exception:
        total = Decimal("0")

    # Upsert on (portfolio_id, date)
    stmt = insert(PortfolioValuationDaily).values(
        portfolio_id=portfolio_id,
        date=as_of,
        total_value=total,          # Numeric(20,4)
        by_stock=Decimal("0"),
        by_etf=Decimal("0"),
        by_bond=Decimal("0"),
        by_crypto=Decimal("0"),
        by_commodity=Decimal("0"),
        by_cash=Decimal("0"),
        net_contributions=Decimal("0"),
        created_at=datetime.utcnow(),   # matches your model’s naive UTC datetime
    ).on_conflict_do_update(
        index_elements=["portfolio_id", "date"],  # matches your UniqueConstraint
        set_={
            "total_value": total,
            # keep breakdowns/net_contributions zero for now (will fill later)
            "by_stock": Decimal("0"),
            "by_etf": Decimal("0"),
            "by_bond": Decimal("0"),
            "by_crypto": Decimal("0"),
            "by_commodity": Decimal("0"),
            "by_cash": Decimal("0"),
            "net_contributions": Decimal("0"),
            # don't touch created_at on update
        },
    )

    db.execute(stmt)
    db.commit()

    return {
        "message": "materialized",
        "portfolio_id": portfolio_id,
        "date": as_of.isoformat(),
        "total_value": str(total),
    }
