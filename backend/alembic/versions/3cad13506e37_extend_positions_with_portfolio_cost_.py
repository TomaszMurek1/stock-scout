"""extend positions with portfolio cost basis

Revision ID: 3cad13506e37
Revises: add_portfolio_returns_and_nullable_company_id
Create Date: 2025-11-14 15:53:18.204904

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cad13506e37'
down_revision: Union[str, None] = 'add_portfolio_returns_and_nullable_company_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade():
    # 1) Rename existing columns
    op.alter_column(
        "positions",
        "avg_cost",
        new_column_name="avg_cost_instrument_ccy",
        existing_type=sa.Numeric(18, 8),
        existing_nullable=False,
    )
    op.alter_column(
        "positions",
        "avg_cost_ccy",
        new_column_name="instrument_currency_code",
        existing_type=sa.String(length=3),
        existing_nullable=False,
    )

    # 2) Add new columns with a temporary server_default for backfill
    op.add_column(
        "positions",
        sa.Column(
            "avg_cost_portfolio_ccy",
            sa.Numeric(18, 8),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "positions",
        sa.Column(
            "total_cost_instrument_ccy",
            sa.Numeric(20, 4),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "positions",
        sa.Column(
            "total_cost_portfolio_ccy",
            sa.Numeric(20, 4),
            nullable=False,
            server_default="0",
        ),
    )

    # Optionally drop server_default later if you want strict inserts
    op.alter_column("positions", "avg_cost_portfolio_ccy", server_default=None)
    op.alter_column("positions", "total_cost_instrument_ccy", server_default=None)
    op.alter_column("positions", "total_cost_portfolio_ccy", server_default=None)


def downgrade():
    # Reverse of upgrade (drop new columns, rename back)
    op.drop_column("positions", "total_cost_portfolio_ccy")
    op.drop_column("positions", "total_cost_instrument_ccy")
    op.drop_column("positions", "avg_cost_portfolio_ccy")

    op.alter_column(
        "positions",
        "instrument_currency_code",
        new_column_name="avg_cost_ccy",
        existing_type=sa.String(length=3),
        existing_nullable=False,
    )
    op.alter_column(
        "positions",
        "avg_cost_instrument_ccy",
        new_column_name="avg_cost",
        existing_type=sa.Numeric(18, 8),
        existing_nullable=False,
    )