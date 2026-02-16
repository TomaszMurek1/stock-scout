"""add_telegram_chat_id_to_users

Revision ID: 2cac58a5785b
Revises: 343016a8669d
Create Date: 2026-02-16 18:31:30.451308

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2cac58a5785b'
down_revision: Union[str, None] = '343016a8669d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add telegram_chat_id column to users table."""
    op.add_column('users', sa.Column('telegram_chat_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove telegram_chat_id column from users table."""
    op.drop_column('users', 'telegram_chat_id')
