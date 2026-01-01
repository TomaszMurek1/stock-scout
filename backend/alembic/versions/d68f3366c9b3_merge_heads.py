"""merge heads

Revision ID: d68f3366c9b3
Revises: e1f2g3h4i5j6, 2fdac7c7385c
Create Date: 2026-01-01 13:12:08.483444

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd68f3366c9b3'
down_revision: Union[str, None] = ('e1f2g3h4i5j6', '2fdac7c7385c')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
