"""remove_expires_at_from_invitations

Revision ID: 8f1e7029e214
Revises: fa4ae4f3af20
Create Date: 2026-01-01 14:27:33.124877

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f1e7029e214'
down_revision: Union[str, None] = 'fa4ae4f3af20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('invitations', 'expires_at')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('invitations', sa.Column('expires_at', sa.DateTime(), nullable=True))
