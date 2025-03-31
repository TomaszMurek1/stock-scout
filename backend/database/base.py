import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session

load_dotenv() 
# Update the connection string for PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine without SQLite-specific connect_args.
engine = create_engine(
    DATABASE_URL,
    pool_size=5,      # Set the size of the connection pool
    max_overflow=10   # Allow extra connections if pool is full
)

# Using scoped_session to ensure each thread gets its own session.
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()

# Dependency to get a database session.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
