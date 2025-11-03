"""extend transactions table

Revision ID: 2aca0129c07b
Revises: 60fc84ae8f59
Create Date: 2025-05-12 14:12:49.448010

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "2aca0129c07b"
down_revision: Union[str, None] = "60fc84ae8f59"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add currency and currency_rate with backfill and enforce NOT NULL."""
    # Step 1: Add columns as nullable with server defaults for backfill
    op.add_column(
        "transactions",
        sa.Column("currency", sa.String(length=3), nullable=True, server_default="USD"),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "currency_rate",
            sa.Numeric(precision=18, scale=6),
            nullable=True,
            server_default="1.0",
        ),
    )

    # Step 2: Backfill existing rows
    op.execute("UPDATE transactions SET currency = 'USD' WHERE currency IS NULL")
    op.execute(
        "UPDATE transactions SET currency_rate = 1.0 WHERE currency_rate IS NULL"
    )

    # Step 3: Alter columns to be NOT NULL and drop server defaults
    op.alter_column(
        "transactions",
        "currency",
        existing_type=sa.String(length=3),
        nullable=False,
        server_default=None,
    )
    op.alter_column(
        "transactions",
        "currency_rate",
        existing_type=sa.Numeric(precision=18, scale=6),
        nullable=False,
        server_default=None,
    )


def downgrade() -> None:
    """Downgrade schema: drop currency and currency_rate columns."""
    op.drop_column("transactions", "currency_rate")
    op.drop_column("transactions", "currency")
