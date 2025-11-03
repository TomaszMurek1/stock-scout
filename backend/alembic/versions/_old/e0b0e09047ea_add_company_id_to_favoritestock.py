"""Add company_id to FavoriteStock

Revision ID: e0b0e09047ea
Revises: 3397e6310e04
Create Date: 2025-04-06 12:39:14.365289
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = 'e0b0e09047ea'
down_revision: Union[str, None] = '3397e6310e04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('favorite_stocks')]

    if 'company_id' not in columns:
        op.add_column('favorite_stocks', sa.Column('company_id', sa.Integer(), nullable=False))
        op.create_foreign_key(None, 'favorite_stocks', 'companies', ['company_id'], ['company_id'])
    else:
        print("⚠️  Skipping: 'company_id' already exists in favorite_stocks")


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('favorite_stocks')]

    if 'company_id' in columns:
        op.drop_constraint(None, 'favorite_stocks', type_='foreignkey')
        op.drop_column('favorite_stocks', 'company_id')
