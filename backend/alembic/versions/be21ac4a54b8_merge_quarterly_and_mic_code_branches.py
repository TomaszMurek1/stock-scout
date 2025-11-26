"""merge quarterly and mic_code branches

Revision ID: be21ac4a54b8
Revises: 115d39936229, 9a9c9f5c5b2f
Create Date: 2025-11-22 12:31:20.891584

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be21ac4a54b8'
down_revision: Union[str, None] = ('115d39936229', '9a9c9f5c5b2f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
