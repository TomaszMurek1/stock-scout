"""Remove ticker from favorite_stocks

Revision ID: 1ba1f90825af
Revises: e0b0e09047ea
Create Date: 2025-04-06 XX:XX:XX
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from typing import Sequence, Union

revision: str = '1ba1f90825af'
down_revision: Union[str, None] = 'e0b0e09047ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('favorite_stocks')]

    if 'ticker' in columns:
        op.drop_column('favorite_stocks', 'ticker')
    else:
        print("⚠️  Skipping: 'ticker' column not found in favorite_stocks")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('favorite_stocks')]

    if 'ticker' not in columns:
        op.add_column('favorite_stocks', sa.Column('ticker', sa.String(), nullable=True))
