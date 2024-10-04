from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker,scoped_session

DATABASE_URL = "sqlite:///backend/database/stock_scout1.db"


engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    pool_size=5,  # Set the size of the connection pool
    max_overflow=10,  # Allow extra connections if pool is full
)
# Using scoped_session to ensure each thread gets its own session
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
