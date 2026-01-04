"""add_german_market

Revision ID: ee3fb221cg60
Revises: dd2ea110bf59
Create Date: 2026-01-03 19:47:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee3fb221cg60'
down_revision: Union[str, None] = 'dd2ea110bf59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Fix the sequence to be in sync with actual max ID
    op.execute("""
        SELECT setval('markets_market_id_seq', COALESCE((SELECT MAX(market_id) FROM markets), 1), true)
    """)
    
    # Insert German market (Xetra)
    op.execute("""
        INSERT INTO markets (name, mic_code, country, currency, timezone, exchange_code)
        VALUES ('Xetra', 'XETR', 'Germany', 'EUR', 'Europe/Berlin', 'XETR')
    """)
    
    # Create partition for stock_price_history
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT market_id FROM markets WHERE mic_code = 'XETR'"))
    market_id = result.scalar()
    if market_id:
        op.execute(f"CREATE TABLE IF NOT EXISTS stock_price_history_xetr PARTITION OF stock_price_history FOR VALUES IN ({market_id})")
    else:
        print("Warning: Market XETR not found, skipping partition creation")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS stock_price_history_xetr")
    op.execute("DELETE FROM markets WHERE mic_code = 'XETR'")
