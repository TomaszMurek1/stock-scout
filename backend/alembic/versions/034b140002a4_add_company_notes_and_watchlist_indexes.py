"""add company_notes and watchlist indexes

Revision ID: 034b140002a4
Revises: 779649d854e3
Create Date: 2025-11-18 12:33:28.890842

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '034b140002a4'
down_revision: Union[str, None] = '779649d854e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # --- 1) CREATE TABLE IF NOT EXISTS ---
    if "company_notes" not in inspector.get_table_names():
        op.create_table(
            "company_notes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "company_id",
                sa.Integer(),
                sa.ForeignKey("companies.company_id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("investment_thesis", sa.Text(), nullable=True),
            sa.Column("risk_factors", sa.Text(), nullable=True),

            sa.Column("monitoring_triggers", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("quality_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("target_prices", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("position_recommendation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("next_catalyst", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("source_links", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("custom_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True),

            sa.Column("intrinsic_value_low", sa.Numeric(18, 4), nullable=True),
            sa.Column("intrinsic_value_high", sa.Numeric(18, 4), nullable=True),
            sa.Column("margin_of_safety", sa.Numeric(5, 2), nullable=True),

            sa.Column("research_status", sa.String(length=32), nullable=True),
            sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),

            sa.Column("review_schedule", sa.String(length=32), nullable=True),
            sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("next_review_due", sa.DateTime(timezone=True), nullable=True),

            sa.Column("sentiment_score", sa.SmallInteger(), nullable=True),
            sa.Column("sentiment_trend", sa.String(length=16), nullable=True),

            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),

            sa.UniqueConstraint("user_id", "company_id", name="uq_company_notes_user_company"),
            sa.CheckConstraint(
                "(sentiment_score IS NULL) OR (sentiment_score BETWEEN -10 AND 10)",
                name="ck_company_notes_sentiment_score_range",
            ),
        )
    else:
        print("company_notes table already exists — skipping create_table")

    # --- 2) Indexes (safe, IF NOT EXISTS) ---
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_notes_user ON company_notes(user_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_notes_company ON company_notes(company_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_notes_status ON company_notes(research_status);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_notes_tags_gin ON company_notes USING GIN(tags);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_company_notes_monitoring_triggers_gin ON company_notes USING GIN(monitoring_triggers);"
    )

    # --- 3) Watchlist (favorite_stocks) indexes ---
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_favorite_stocks_user ON favorite_stocks(user_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_favorite_stocks_company ON favorite_stocks(company_id);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_favorite_stocks_user;")
    op.execute("DROP INDEX IF EXISTS idx_favorite_stocks_company;")

    op.execute("DROP INDEX IF EXISTS idx_company_notes_monitoring_triggers_gin;")
    op.execute("DROP INDEX IF EXISTS idx_company_notes_tags_gin;")
    op.execute("DROP INDEX IF EXISTS idx_company_notes_status;")
    op.execute("DROP INDEX IF EXISTS idx_company_notes_company;")
    op.execute("DROP INDEX IF EXISTS idx_company_notes_user;")

    op.execute("DROP TABLE IF EXISTS company_notes;")