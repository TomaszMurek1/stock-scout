"""add transfer_group_id to transactions

Revision ID: a583f3abbe4d
Revises: 5e7f6a01b509
Create Date: 2025-11-07 09:27:49.345460

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a583f3abbe4d'
down_revision: Union[str, None] = '5e7f6a01b509'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "transactions",
        sa.Column("transfer_group_id", sa.String(length=36), nullable=True, index=True),
    )

def downgrade():
    op.drop_column("transactions", "transfer_group_id")