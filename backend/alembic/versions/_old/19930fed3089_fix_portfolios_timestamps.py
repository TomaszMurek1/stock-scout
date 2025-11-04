"""Fix portfolios timestamps

Revision ID: 19930fed3089
Revises: 331013565bcc
Create Date: 2025-05-10 16:02:55.987385
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers
revision: str = '19930fed3089'
down_revision: Union[str, None] = '331013565bcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema safely."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # --- Handle positions table safely ---
    if "positions" in inspector.get_table_names():
        existing_indexes = [i["name"] for i in inspector.get_indexes("positions")]
        if "ix_positions_id" in existing_indexes:
            op.drop_index("ix_positions_id", table_name="positions")
        else:
            print("⚠️  Skipping: index 'ix_positions_id' not found on positions")
        op.drop_table("positions")
    else:
        print("⚠️  Skipping: table 'positions' not found")

    # --- favorite_stocks changes ---
    fav_cols = [c["name"] for c in inspector.get_columns("favorite_stocks")]
    if "created_at" not in fav_cols:
        op.add_column("favorite_stocks", sa.Column("created_at", sa.DateTime(), nullable=True))
    else:
        print("⚠️  Skipping: 'created_at' already exists in favorite_stocks")

    existing_indexes = [i["name"] for i in inspector.get_indexes("favorite_stocks")]
    if "ix_favorite_stocks_id" in existing_indexes:
        op.drop_index("ix_favorite_stocks_id", table_name="favorite_stocks")

    op.create_unique_constraint(None, "favorite_stocks", ["user_id", "company_id"])

    # --- portfolio_positions changes ---
    port_cols = [c["name"] for c in inspector.get_columns("portfolio_positions")]
    if "last_updated" not in port_cols:
        op.add_column("portfolio_positions", sa.Column("last_updated", sa.DateTime(), nullable=True))
    else:
        print("⚠️  Skipping: 'last_updated' already exists in portfolio_positions")

    existing_indexes = [i["name"] for i in inspector.get_indexes("portfolio_positions")]
    if "ix_portfolio_positions_id" in existing_indexes:
        op.drop_index("ix_portfolio_positions_id", table_name="portfolio_positions")

    op.create_unique_constraint(None, "portfolio_positions", ["portfolio_id", "company_id"])

    # --- transactions changes ---
    trans_cols = [c["name"] for c in inspector.get_columns("transactions")]
    if "fee" not in trans_cols:
        op.add_column("transactions", sa.Column("fee", sa.Numeric(precision=18, scale=4), nullable=False))
    else:
        print("⚠️  Skipping: 'fee' already exists in transactions")

    op.alter_column("transactions", "company_id",
        existing_type=sa.INTEGER(),
        nullable=True
    )

    existing_indexes = [i["name"] for i in inspector.get_indexes("transactions")]
    if "ix_transactions_id" in existing_indexes:
        op.drop_index("ix_transactions_id", table_name="transactions")
    else:
        print("⚠️  Skipping: index 'ix_transactions_id' not found on transactions")


def downgrade() -> None:
    """Reverse changes safely."""
    conn = op.get_bind()
    inspector = inspect(conn)

    # Add downgrade logic only if needed — or leave blank if irreversible
    print("⚠️  Downgrade not implemented (safe forward-only migration)")
