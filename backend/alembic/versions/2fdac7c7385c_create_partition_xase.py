"""create_partition_xase

Revision ID: 2fdac7c7385c
Revises: 7bff4168ea88
Create Date: 2025-12-07 11:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fdac7c7385c'
down_revision: Union[str, None] = '7bff4168ea88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT market_id FROM markets WHERE mic_code = 'XASE'"))
    market_id = result.scalar()
    if market_id:
        # Use simple string interpolation safely here since market_id is integer
        op.execute(f"CREATE TABLE IF NOT EXISTS stock_price_history_xase PARTITION OF stock_price_history FOR VALUES IN ({market_id})")
    else:
        print("Warning: Market XASE not found, skipping partition creation")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS stock_price_history_xase")
