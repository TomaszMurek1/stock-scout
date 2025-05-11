from sqlalchemy.orm import Session
from database.portfolio import Portfolio


def get_or_create_portfolio(db: Session, user_id: int) -> Portfolio:
    p = db.query(Portfolio).filter_by(user_id=user_id).first()
    if not p:
        p = Portfolio(user_id=user_id, name="Default")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p
