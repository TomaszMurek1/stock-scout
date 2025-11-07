from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b523d6eedd70"
down_revision = "cdd32e3ff251"
branch_labels = None
depends_on = None


def upgrade():
    # 1) Add nullable column
    op.add_column(
        "transactions",
        sa.Column("account_id", sa.Integer(), nullable=True),
    )

    # 2) Create index early for speed
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])

    # 3) Add FK constraint (deferred until after backfill)
    op.create_foreign_key(
        "fk_transactions_account_id_accounts",
        "transactions",
        "accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 4) Backfill: assign each transaction to its portfolio's Default account
    op.execute("""
        UPDATE transactions t
        SET account_id = a.id
        FROM accounts a
        WHERE a.portfolio_id = t.portfolio_id
          AND a.name = 'Default'
    """)

    # 5) Enforce NOT NULL (after backfill)
    op.alter_column("transactions", "account_id", nullable=False)


def downgrade():
    op.drop_constraint("fk_transactions_account_id_accounts", "transactions", type_="foreignkey")
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.drop_column("transactions", "account_id")
