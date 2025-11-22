"""add quarterly financials support and analyst tables

Revision ID: 9a9c9f5c5b2f
Revises: 779649d854e3
Create Date: 2025-11-22 11:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9a9c9f5c5b2f"
down_revision: Union[str, None] = "779649d854e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    with op.batch_alter_table("company_financial_history") as batch:
        if "period_type" not in [c["name"] for c in inspector.get_columns("company_financial_history")]:
            batch.add_column(
                sa.Column(
                    "period_type",
                    sa.String(length=20),
                    nullable=False,
                    server_default="annual",
                )
            )
        # Rebuild constraints/indexes to include period_type if not already adjusted
        existing_uk = {uc["name"] for uc in inspector.get_unique_constraints("company_financial_history")}
        if "uq_company_hist_company_date" in existing_uk:
            batch.drop_constraint("uq_company_hist_company_date", type_="unique")
        existing_idx = {idx["name"] for idx in inspector.get_indexes("company_financial_history")}
        if "idx_company_hist_company_date" in existing_idx:
            batch.drop_index("idx_company_hist_company_date")
        batch.create_unique_constraint(
            "uq_company_hist_company_date",
            ["company_id", "report_end_date", "period_type"],
        )
        batch.create_index(
            "idx_company_hist_company_date",
            ["company_id", "report_end_date", "period_type"],
        )
    op.execute(
        "UPDATE company_financial_history SET period_type = 'annual' WHERE period_type IS NULL"
    )

    if not inspector.has_table("company_recommendation_history"):
        op.create_table(
            "company_recommendation_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_id", sa.Integer(), nullable=False),
            sa.Column("action_date", sa.DateTime(), nullable=False),
            sa.Column("firm", sa.String(), nullable=True),
            sa.Column("action", sa.String(), nullable=True),
            sa.Column("from_grade", sa.String(), nullable=True),
            sa.Column("to_grade", sa.String(), nullable=True),
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
                "action_date",
                "firm",
                "action",
                "to_grade",
                name="uq_company_reco_unique_row",
            ),
        )
        op.create_index(
            op.f("ix_company_recommendation_history_action_date"),
            "company_recommendation_history",
            ["action_date"],
            unique=False,
        )

    if not inspector.has_table("company_estimate_history"):
        op.create_table(
            "company_estimate_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_id", sa.Integer(), nullable=False),
            sa.Column("estimate_type", sa.String(length=20), nullable=False),
            sa.Column("period_label", sa.String(length=50), nullable=False),
            sa.Column("average", sa.Float(), nullable=True),
            sa.Column("low", sa.Float(), nullable=True),
            sa.Column("high", sa.Float(), nullable=True),
            sa.Column("number_of_analysts", sa.Integer(), nullable=True),
            sa.Column("year_ago", sa.Float(), nullable=True),
            sa.Column("growth", sa.Float(), nullable=True),
            sa.Column("currency", sa.String(length=10), nullable=True),
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
                "estimate_type",
                "period_label",
                name="uq_company_estimate_unique",
            ),
        )
        op.create_index(
            op.f("ix_company_estimate_history_estimate_type"),
            "company_estimate_history",
            ["estimate_type"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_company_estimate_history_estimate_type"),
        table_name="company_estimate_history",
    )
    op.drop_table("company_estimate_history")
    op.drop_index(
        op.f("ix_company_recommendation_history_action_date"),
        table_name="company_recommendation_history",
    )
    op.drop_table("company_recommendation_history")
    with op.batch_alter_table("company_financial_history") as batch:
        batch.drop_index("idx_company_hist_company_date")
        batch.drop_constraint(
            "uq_company_hist_company_date", type_="unique"
        )
        batch.create_unique_constraint(
            "uq_company_hist_company_date", ["company_id", "report_end_date"]
        )
        batch.create_index(
            "idx_company_hist_company_date", ["company_id", "report_end_date"]
        )
        batch.drop_column("period_type")
