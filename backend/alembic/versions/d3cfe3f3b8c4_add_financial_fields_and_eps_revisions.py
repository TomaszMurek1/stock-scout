"""add financial fields and eps revisions

Revision ID: d3cfe3f3b8c4
Revises: be21ac4a54b8
Create Date: 2025-11-22 12:55:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d3cfe3f3b8c4"
down_revision: Union[str, None] = "be21ac4a54b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    def _add_missing_columns(table: str, columns: list[tuple[str, sa.types.TypeEngine]]):
        existing = {c["name"] for c in inspector.get_columns(table)}
        with op.batch_alter_table(table) as batch:
            for name, coltype in columns:
                if name not in existing:
                    batch.add_column(sa.Column(name, coltype, nullable=True))

    _add_missing_columns(
        "company_financials",
        [
            ("operating_cash_flow", sa.Float()),
            ("total_assets", sa.Float()),
            ("total_liabilities", sa.Float()),
            ("total_equity", sa.Float()),
            ("current_assets", sa.Float()),
            ("current_liabilities", sa.Float()),
            ("working_capital", sa.Float()),
            ("analyst_price_target", sa.Float()),
        ],
    )

    _add_missing_columns(
        "company_financial_history",
        [
            ("operating_cash_flow", sa.Float()),
            ("total_assets", sa.Float()),
            ("total_liabilities", sa.Float()),
            ("total_equity", sa.Float()),
            ("current_assets", sa.Float()),
            ("current_liabilities", sa.Float()),
            ("working_capital", sa.Float()),
            ("analyst_price_target", sa.Float()),
        ],
    )

    if not inspector.has_table("company_eps_revision_history"):
        op.create_table(
            "company_eps_revision_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_id", sa.Integer(), nullable=False),
            sa.Column("period_label", sa.String(length=50), nullable=False),
            sa.Column("revision_up", sa.Float(), nullable=True),
            sa.Column("revision_down", sa.Float(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["company_id"], ["companies.company_id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "company_id",
                "period_label",
                name="uq_company_eps_revision",
            ),
        )
        op.create_index(
            op.f("ix_company_eps_revision_history_period_label"),
            "company_eps_revision_history",
            ["period_label"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_company_eps_revision_history_period_label"),
        table_name="company_eps_revision_history",
    )
    op.drop_table("company_eps_revision_history")
    with op.batch_alter_table("company_financial_history") as batch:
        batch.drop_column("analyst_price_target")
        batch.drop_column("working_capital")
        batch.drop_column("current_liabilities")
        batch.drop_column("current_assets")
        batch.drop_column("total_equity")
        batch.drop_column("total_liabilities")
        batch.drop_column("total_assets")
        batch.drop_column("operating_cash_flow")
    with op.batch_alter_table("company_financials") as batch:
        batch.drop_column("analyst_price_target")
        batch.drop_column("working_capital")
        batch.drop_column("current_liabilities")
        batch.drop_column("current_assets")
        batch.drop_column("total_equity")
        batch.drop_column("total_liabilities")
        batch.drop_column("total_assets")
        batch.drop_column("operating_cash_flow")
