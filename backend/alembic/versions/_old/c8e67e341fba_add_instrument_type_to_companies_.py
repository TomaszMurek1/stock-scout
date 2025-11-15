"""add instrument_type to companies + backfill

Revision ID: c8e67e341fba
Revises: a583f3abbe4d
Create Date: 2025-11-07 10:33:33.560232
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c8e67e341fba"
down_revision: Union[str, None] = "a583f3abbe4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0) Ensure the enum type exists with LOWERCASE labels
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instrumenttype') THEN
            CREATE TYPE instrumenttype AS ENUM ('stock','etf','bond','crypto','commodity','cash');
        END IF;
    END$$;
    """)

    # 1) Add the column using the existing enum (create_type=False)
    op.add_column(
        "companies",
        sa.Column(
            "instrument_type",
            postgresql.ENUM(
                "stock", "etf", "bond", "crypto", "commodity", "cash",
                name="instrumenttype",
                create_type=False
            ),
            nullable=False,
            server_default="stock",  # <-- lowercase to match the enum labels
        ),
    )

    # 2) Optional index
    op.create_index("ix_companies_instrument_type", "companies", ["instrument_type"])

    # 3) (Optional) backfill specific issuers here if you have rules

    # 4) Drop the runtime default so future inserts must be explicit
    op.alter_column("companies", "instrument_type", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_companies_instrument_type", table_name="companies")
    op.drop_column("companies", "instrument_type")
    # (Leave the enum type in place)
