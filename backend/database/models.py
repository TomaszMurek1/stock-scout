from sqlalchemy import Column, Integer, String, Date, Float, ForeignKey, Table, UniqueConstraint, Index, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Tabela asocjacyjna dla relacji wiele-do-wielu między spółkami a indeksami
company_indexes_table = Table(
    'company_indexes',
    Base.metadata,
    Column('company_id', Integer, ForeignKey('companies.company_id'), primary_key=True),
    Column('index_id', Integer, ForeignKey('stock_indexes.index_id'), primary_key=True)
)

class Market(Base):
    __tablename__ = 'markets'

    market_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    country = Column(String)
    currency = Column(String)
    timezone = Column(String)
    exchange_code = Column(String)

    # Relacje
    indexes = relationship('StockIndex', back_populates='market', cascade='all, delete-orphan')
    companies = relationship('Company', back_populates='market', cascade='all, delete-orphan')

class StockIndex(Base):
    __tablename__ = 'stock_indexes'

    index_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)

    # Relacje
    market = relationship('Market', back_populates='indexes')
    companies = relationship('Company', secondary=company_indexes_table, back_populates='stock_indexes')

    __table_args__ = (
        Index('idx_indexes_name', 'name'),
    )

class Company(Base):
    __tablename__ = 'companies'

    company_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    ticker = Column(String, nullable=False, index=True)
    market_id = Column(Integer, ForeignKey('markets.market_id'), nullable=False)
    sector = Column(String)
    industry = Column(String)

    # Relacje
    market = relationship('Market', back_populates='companies')
    stock_indexes = relationship('StockIndex', secondary=company_indexes_table, back_populates='companies')
    historical_data = relationship('HistoricalData', back_populates='company', cascade='all, delete-orphan')

    __table_args__ = (
        UniqueConstraint('ticker', name='_company_ticker_uc'),
        Index('idx_companies_ticker', 'ticker'),
    )


class HistoricalDataSP500(Base):
    __tablename__ = 'historical_data_sp500'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')  # Assuming one-to-many relation with Company

class HistoricalDataNasdaq(Base):
    __tablename__ = 'historical_data_nasdaq'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')  # Assuming one-to-many relation with Company

class HistoricalDataDowjones(Base):
    __tablename__ = 'historical_data_dowjones'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')  # Assuming one-to-many relation with Company



class HistoricalDataWSE(Base):
    __tablename__ = 'historical_data_wse'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')


class HistoricalDataCAC(Base):
    __tablename__ = 'historical_data_cac'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    company = relationship('Company')    

class HistoricalData(Base):
    __tablename__ = 'historical_data'

    data_id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.company_id'), nullable=False)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    adjusted_close = Column(Float)
    volume = Column(Integer)

    # Relacje
    company = relationship('Company', back_populates='historical_data')

    __table_args__ = (
        UniqueConstraint('company_id', 'date', name='_company_date_uc'),
        Index('idx_historicaldata_date', 'date'),
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
