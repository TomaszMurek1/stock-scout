"""add cash column to accounts

Revision ID: 7d72dfc9d18b
Revises: 779649d854e3
Create Date: 2025-11-15 18:32:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7d72dfc9d18b"
down_revision = "034b140002a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column(
            "cash",
            sa.Numeric(18, 4),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )
    op.alter_column("accounts", "cash", server_default=None)


def downgrade() -> None:
    op.drop_column("accounts", "cash")
