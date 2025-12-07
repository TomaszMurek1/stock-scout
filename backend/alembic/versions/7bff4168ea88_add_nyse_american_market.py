"""add_nyse_american_market

Revision ID: 7bff4168ea88
Revises: b1c2d3e4f5a6
Create Date: 2025-12-07 11:21:06.080007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7bff4168ea88'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        INSERT INTO markets (name, mic_code, country, currency, timezone, exchange_code)
        VALUES ('NYSE American', 'XASE', 'United States', 'USD', 'America/New_York', 'ASE')
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM markets WHERE mic_code = 'XASE'")
