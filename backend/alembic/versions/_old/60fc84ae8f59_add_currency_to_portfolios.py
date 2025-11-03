"""add currency to portfolios

Revision ID: 60fc84ae8f59
Revises: 19930fed3089
Create Date: 2025-05-11 12:47:24.161740
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "60fc84ae8f59"
down_revision: Union[str, None] = "19930fed3089"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) backfill any NULLs so the NOT NULL alter will succeed
    op.execute("UPDATE favorite_stocks SET created_at = now() WHERE created_at IS NULL")

    # 2) now make created_at NOT NULL
    op.alter_column(
        "favorite_stocks",
        "created_at",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    # your existing indexes / constraints changes...
    op.drop_constraint(
        "favorite_stocks_user_id_company_id_key", "favorite_stocks", type_="unique"
    )
    op.create_index(
        op.f("ix_favorite_stocks_id"), "favorite_stocks", ["id"], unique=False
    )
    op.create_unique_constraint(
        "uq_favorite_stocks_user_company", "favorite_stocks", ["user_id", "company_id"]
    )

    op.alter_column(
        "portfolio_positions",
        "last_updated",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )
    op.drop_constraint(
        "portfolio_positions_portfolio_id_company_id_key",
        "portfolio_positions",
        type_="unique",
    )
    op.create_index(
        op.f("ix_portfolio_positions_id"), "portfolio_positions", ["id"], unique=False
    )
    op.create_unique_constraint(
        "uq_portfolio_positions_portfolio_company",
        "portfolio_positions",
        ["portfolio_id", "company_id"],
    )

    # 3) add the new currency column, back‐filled with 'USD' for existing rows
    op.add_column(
        "portfolios",
        sa.Column(
            "currency", sa.String(length=3), nullable=False, server_default="USD"
        ),
    )
    # and drop the server_default so future INSERTs must explicitly set currency
    op.alter_column("portfolios", "currency", server_default=None)

    op.alter_column(
        "transactions", "company_id", existing_type=sa.INTEGER(), nullable=False
    )
    op.alter_column(
        "transactions",
        "fee",
        existing_type=sa.NUMERIC(precision=18, scale=4),
        nullable=True,
    )
    op.create_index(op.f("ix_transactions_id"), "transactions", ["id"], unique=False)


def downgrade() -> None:
    # reverse in the opposite order
    op.drop_index(op.f("ix_transactions_id"), table_name="transactions")
    op.alter_column(
        "transactions",
        "fee",
        existing_type=sa.NUMERIC(precision=18, scale=4),
        nullable=False,
    )
    op.alter_column(
        "transactions", "company_id", existing_type=sa.INTEGER(), nullable=True
    )

    op.drop_column("portfolios", "currency")

    op.drop_constraint(
        "uq_portfolio_positions_portfolio_company",
        "portfolio_positions",
        type_="unique",
    )
    op.drop_index(op.f("ix_portfolio_positions_id"), table_name="portfolio_positions")
    op.create_unique_constraint(
        "portfolio_positions_portfolio_id_company_id_key",
        "portfolio_positions",
        ["portfolio_id", "company_id"],
    )
    op.alter_column(
        "portfolio_positions",
        "last_updated",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    op.drop_constraint(
        "uq_favorite_stocks_user_company", "favorite_stocks", type_="unique"
    )
    op.drop_index(op.f("ix_favorite_stocks_id"), table_name="favorite_stocks")
    op.create_unique_constraint(
        "favorite_stocks_user_id_company_id_key",
        "favorite_stocks",
        ["user_id", "company_id"],
    )
    op.alter_column(
        "favorite_stocks",
        "created_at",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )
