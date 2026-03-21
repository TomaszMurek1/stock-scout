"""deduplicate_and_unique_company_market_data

Revision ID: fd767e979d90
Revises: a3b4c5d6e7f8
Create Date: 2026-03-21 07:09:30.369562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd767e979d90'
down_revision: Union[str, None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    1. Delete duplicate CompanyMarketData rows (keep newest per company_id).
    2. Remove sma_50 and sma_200 columns (data now lives in stock_price_history).
    3. Add UNIQUE constraint on company_id to prevent future duplicates.
    """
    # Step 1: Delete duplicates — keep the row with the latest last_updated
    # per company_id (tie-break on highest id).
    op.execute("""
        DELETE FROM company_market_data
        WHERE id NOT IN (
            SELECT DISTINCT ON (company_id) id
            FROM company_market_data
            ORDER BY company_id, last_updated DESC, id DESC
        )
    """)

    # Step 2: Remove sma columns (data now in stock_price_history)
    op.drop_column('company_market_data', 'sma_50')
    op.drop_column('company_market_data', 'sma_200')

    # Step 3: Add UNIQUE constraint on company_id
    op.create_unique_constraint(
        'uq_company_market_data_company_id',
        'company_market_data',
        ['company_id'],
    )


def downgrade() -> None:
    """Reverse: drop constraint, re-add columns."""
    op.drop_constraint(
        'uq_company_market_data_company_id',
        'company_market_data',
        type_='unique',
    )
    op.add_column(
        'company_market_data',
        sa.Column('sma_50', sa.Float(), nullable=True),
    )
    op.add_column(
        'company_market_data',
        sa.Column('sma_200', sa.Float(), nullable=True),
    )
