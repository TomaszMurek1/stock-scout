"""add_sma_columns_to_price_history

Revision ID: a3b4c5d6e7f8
Revises: b2f4a7c9d1e3
Create Date: 2026-03-20 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = 'b2f4a7c9d1e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Legacy index names → correct MIC-code-based names
INDEX_RENAMES = [
    # gspc -> xnas (NASDAQ)
    ("stock_price_history_gspc_pkey", "stock_price_history_xnas_pkey"),
    ("stock_price_history_gspc_company_id_market_id_date_idx", "stock_price_history_xnas_company_id_market_id_date_idx"),
    ("stock_price_history_gspc_company_id_market_id_date_key", "stock_price_history_xnas_company_id_market_id_date_key"),
    ("stock_price_history_gspc_date_idx1", "stock_price_history_xnas_date_idx"),
    # dowjones -> xnys (NYSE)
    ("stock_price_history_dowjones_pkey", "stock_price_history_xnys_pkey"),
    ("stock_price_history_dowjones_company_id_market_id_date_idx", "stock_price_history_xnys_company_id_market_id_date_idx"),
    ("stock_price_history_dowjones_company_id_market_id_date_key", "stock_price_history_xnys_company_id_market_id_date_key"),
    ("stock_price_history_dowjones_date_idx1", "stock_price_history_xnys_date_idx"),
    # cac -> xpar (Euronext Paris)
    ("stock_price_history_cac_pkey", "stock_price_history_xpar_pkey"),
    ("stock_price_history_cac_company_id_market_id_date_idx", "stock_price_history_xpar_company_id_market_id_date_idx"),
    ("stock_price_history_cac_company_id_market_id_date_key", "stock_price_history_xpar_company_id_market_id_date_key"),
    ("stock_price_history_cac_date_idx1", "stock_price_history_xpar_date_idx"),
    # wse -> xwar (Warsaw Stock Exchange)
    ("stock_price_history_wse_pkey", "stock_price_history_xwar_pkey"),
    ("stock_price_history_wse_company_id_market_id_date_idx", "stock_price_history_xwar_company_id_market_id_date_idx"),
    ("stock_price_history_wse_company_id_market_id_date_key", "stock_price_history_xwar_company_id_market_id_date_key"),
    ("stock_price_history_wse_date_idx1", "stock_price_history_xwar_date_idx"),
]


def upgrade() -> None:
    """Add cached SMA columns and rename legacy indexes.
    
    SMA columns on the parent partitioned table automatically
    propagate to all child partitions.
    Index renames use IF EXISTS to be idempotent (safe for re-runs).
    """
    # 1) Rename legacy indexes (idempotent — safe on prod even if already renamed)
    conn = op.get_bind()
    for old_name, new_name in INDEX_RENAMES:
        # Check if old name exists before renaming (idempotent)
        result = conn.execute(sa.text(
            "SELECT 1 FROM pg_class WHERE relname = :old_name AND relkind = 'i'"
        ), {"old_name": old_name})
        if result.scalar():
            op.execute(f'ALTER INDEX "{old_name}" RENAME TO "{new_name}"')

    # 2) Add SMA columns
    op.add_column('stock_price_history', sa.Column('sma_20', sa.Float(), nullable=True))
    op.add_column('stock_price_history', sa.Column('sma_50', sa.Float(), nullable=True))
    op.add_column('stock_price_history', sa.Column('sma_100', sa.Float(), nullable=True))
    op.add_column('stock_price_history', sa.Column('sma_200', sa.Float(), nullable=True))

    # 3) Add a composite index for efficient company+date lookups during backtest
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sph_company_date
        ON stock_price_history (company_id, date);
    """)


def downgrade() -> None:
    """Remove SMA columns and restore legacy index names."""
    op.execute("DROP INDEX IF EXISTS idx_sph_company_date;")
    op.drop_column('stock_price_history', 'sma_200')
    op.drop_column('stock_price_history', 'sma_100')
    op.drop_column('stock_price_history', 'sma_50')
    op.drop_column('stock_price_history', 'sma_20')

    # Restore legacy index names
    conn = op.get_bind()
    for old_name, new_name in INDEX_RENAMES:
        result = conn.execute(sa.text(
            "SELECT 1 FROM pg_class WHERE relname = :new_name AND relkind = 'i'"
        ), {"new_name": new_name})
        if result.scalar():
            op.execute(f'ALTER INDEX "{new_name}" RENAME TO "{old_name}"')
