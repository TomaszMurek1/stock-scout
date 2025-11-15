from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys
from dotenv import load_dotenv

# Add the backend directory to Python path so all models can be imported
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# Import ALL your models here to ensure they are registered with Base.metadata
from database.base import Base

# Import ALL your models - this is crucial!
from database.portfolio import Portfolio, Transaction, FavoriteStock
from database.account import Account  # ADD THIS LINE - this was missing!
from database.company import Company
from database.market import Market
from database.position import PortfolioPositions
from database.valuation import PortfolioValuationDaily, PortfolioReturns
from database.stock_data import CompanyMarketData, StockPriceHistory
from database.fx import FxRate

# If you have any other models, import them here too
# from database.other_model import OtherModel

# Alembic config object
config = context.config

config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Logging config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# 🛡️ Protect partitioned child tables from being altered by Alembic
def include_object(object, name, type_, reflected, compare_to):
    # Skip all stock_price_history_* child partitions (except the parent table)
    if (
        type_ == "table"
        and name.startswith("stock_price_history_")
        and name != "stock_price_history"
    ):
        return False
    return True

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()