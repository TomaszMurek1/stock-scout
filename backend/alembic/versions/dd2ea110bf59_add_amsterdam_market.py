"""add_amsterdam_market

Revision ID: dd2ea110bf59
Revises: 8f1e7029e214
Create Date: 2026-01-02 10:04:51.437703

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd2ea110bf59'
down_revision: Union[str, None] = '8f1e7029e214'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Fix the sequence to be in sync with actual max ID
    op.execute("""
        SELECT setval('markets_market_id_seq', COALESCE((SELECT MAX(market_id) FROM markets), 1), true)
    """)
    
    # Insert Amsterdam market
    op.execute("""
        INSERT INTO markets (name, mic_code, country, currency, timezone, exchange_code)
        VALUES ('Euronext Amsterdam', 'XAMS', 'Netherlands', 'EUR', 'Europe/Amsterdam', 'AMS')
    """)
    
    # Create partition for stock_price_history
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT market_id FROM markets WHERE mic_code = 'XAMS'"))
    market_id = result.scalar()
    if market_id:
        op.execute(f"CREATE TABLE IF NOT EXISTS stock_price_history_xams PARTITION OF stock_price_history FOR VALUES IN ({market_id})")
    else:
        print("Warning: Market XAMS not found, skipping partition creation")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS stock_price_history_xams")
    op.execute("DELETE FROM markets WHERE mic_code = 'XAMS'")




