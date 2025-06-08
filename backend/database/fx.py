from sqlalchemy import Column, String, Date, Float, Integer, UniqueConstraint
from .base import Base


class FxRate(Base):
    __tablename__ = "fx_rates"
    id = Column(Integer, primary_key=True)
    base_currency = Column(String, nullable=False)  # e.g. PLN
    quote_currency = Column(String, nullable=False)  # e.g. USD
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)

    __table_args__ = (
        UniqueConstraint("base_currency", "quote_currency", "date", name="_fxrate_uc"),
    )
