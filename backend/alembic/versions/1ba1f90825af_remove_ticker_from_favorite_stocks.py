"""Remove ticker from favorite_stocks

Revision ID: 1ba1f90825af
Revises: e0b0e09047ea
Create Date: 2025-04-06 12:42:40.142203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ba1f90825af'
down_revision: Union[str, None] = 'e0b0e09047ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('favorite_stocks', 'ticker')
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('favorite_stocks', sa.Column('ticker', sa.VARCHAR(), autoincrement=False, nullable=False))
    # ### end Alembic commands ###
