"""add_iban_to_accounts

Revision ID: 5013fc27cb14
Revises: ee3fb221cg60
Create Date: 2026-01-06 19:08:54.909619

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5013fc27cb14'
down_revision: Union[str, None] = 'ee3fb221cg60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('accounts', sa.Column('iban', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('accounts', 'iban')
