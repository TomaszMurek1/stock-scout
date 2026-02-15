from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLAlchemyEnum,
    Boolean as SQLAlchemyBoolean,
    ForeignKey,
    Integer,
    String,
    JSON,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .base import Base


class BasketType(PyEnum):
    MARKET = "market"
    INDEX = "index"
    PORTFOLIO = "portfolio"
    FAVORITES = "favorites"
    CUSTOM = "custom"  # user-defined / watchlist


class Basket(Base):
    __tablename__ = "baskets"
    __table_args__ = (
        UniqueConstraint(
            "name",
            "owner_id",
            name="uq_basket_name_owner",
            postgresql_nulls_not_distinct=True,
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Display name, e.g. "US Stocks", "My Portfolio Holdings"
    name = Column(String, nullable=False)

    # One of BasketType
    type = Column(SQLAlchemyEnum(BasketType), nullable=False)
    
    # Hide from frontend lists (e.g. for "Delisted / OTC")
    is_visible = Column(SQLAlchemyBoolean, default=True, server_default="true", nullable=False)

    # Optional owner (null for system / global baskets like "WIG20", "US", etc.)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Optional reference to a "source" entity (market_id, index_id, portfolio_id, etc.)
    # For example:
    # - type=MARKET  -> reference_id = market_id
    # - type=INDEX   -> reference_id = index_id
    # - type=PORTFOLIO -> reference_id = portfolio_id
    # - type=PORTFOLIO -> reference_id = portfolio_id
    reference_id = Column(Integer, nullable=True)

    # Dynamic rules for "Smart Baskets"
    # Example: {"market_codes": ["XNYS", "XNAS"]}
    rules = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # If you want a direct relationship from User -> Basket, add this in user.py:
    # baskets = relationship("Basket", back_populates="owner")
    owner = relationship("User", backref="baskets")

    # Basket → companies via BasketCompany
    companies = relationship(
        "BasketCompany",
        back_populates="basket",
        cascade="all, delete-orphan",
    )


class BasketCompany(Base):
    __tablename__ = "basket_companies"
    __table_args__ = (
        UniqueConstraint("basket_id", "company_id", name="uq_basket_company"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    basket_id = Column(Integer, ForeignKey("baskets.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.company_id"), nullable=False)

    basket = relationship("Basket", back_populates="companies")
    company = relationship("Company")
