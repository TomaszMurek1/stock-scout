"""add_demo_scope_to_enum

Revision ID: fa4ae4f3af20
Revises: d68f3366c9b3
Create Date: 2026-01-01 13:35:51.532738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa4ae4f3af20'
down_revision: Union[str, None] = 'd68f3366c9b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add 'demo' value to the userscope enum
    connection = op.get_bind()
    connection.execute(sa.text("ALTER TYPE userscope ADD VALUE IF NOT EXISTS 'demo'"))


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL doesn't support removing enum values easily
    # This would require recreating the enum, which is complex
    # For now, we'll leave the enum value in place
    pass
