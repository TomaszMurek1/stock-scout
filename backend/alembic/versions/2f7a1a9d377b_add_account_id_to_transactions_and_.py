"""add account_id to transactions and backfill from Default accounts"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2f7a1a9d377b"
down_revision = "b523d6eedd70"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add nullable column
    op.add_column(
        "transactions",
        sa.Column("account_id", sa.Integer(), nullable=True),
    )

    # 2. Create index
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])

    # 3. Create FK constraint
    op.create_foreign_key(
        "fk_transactions_account_id_accounts",
        "transactions",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 4. Backfill account_id using each portfolio's Default account
    op.execute("""
        UPDATE transactions t
        SET account_id = a.id
        FROM accounts a
        WHERE a.portfolio_id = t.portfolio_id
          AND a.name = 'Default'
    """)

    # 5. Enforce NOT NULL
    op.alter_column("transactions", "account_id", nullable=False)


def downgrade():
    op.drop_constraint("fk_transactions_account_id_accounts", "transactions", type_="foreignkey")
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.drop_column("transactions", "account_id")
