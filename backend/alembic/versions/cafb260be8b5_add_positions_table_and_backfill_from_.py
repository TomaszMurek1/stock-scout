"""add positions table and backfill from transactions"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "cafb260be8b5"
down_revision = "2f7a1a9d377b"  # make sure this matches your previous migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1️⃣ Create positions table
    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.company_id"), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 8), nullable=False, server_default="0"),
        sa.Column("avg_cost", sa.Numeric(18, 8), nullable=False, server_default="0"),
        sa.Column("avg_cost_ccy", sa.String(3), nullable=False),
        sa.Column("last_updated", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("account_id", "company_id", name="uq_position_account_company"),
    )

    op.create_index("ix_positions_account_id", "positions", ["account_id"])
    op.create_index("ix_positions_company_id", "positions", ["company_id"])

    # 2️⃣ Backfill from transactions (aggregate per account + company)
    # Quantity: sum of buys minus sells
    # Average cost: weighted avg of buys
    op.execute("""
        INSERT INTO positions (account_id, company_id, quantity, avg_cost, avg_cost_ccy, last_updated)
        SELECT
            t.account_id,
            t.company_id,
            SUM(
                CASE
                    WHEN t.transaction_type IN (
                        'BUY'::transactiontype,
                        'DEPOSIT'::transactiontype,
                        'DIVIDEND'::transactiontype,
                        'INTEREST'::transactiontype
                    ) THEN t.quantity
                    WHEN t.transaction_type IN (
                        'SELL'::transactiontype,
                        'WITHDRAWAL'::transactiontype,
                        'FEE'::transactiontype,
                        'TAX'::transactiontype
                    ) THEN -t.quantity
                    ELSE 0
                END
            ) AS quantity,
            COALESCE(
                SUM(
                    CASE
                        WHEN t.transaction_type = 'BUY'::transactiontype THEN t.quantity * t.price
                        ELSE 0
                    END
                ) / NULLIF(SUM(
                    CASE
                        WHEN t.transaction_type = 'BUY'::transactiontype THEN t.quantity
                        ELSE 0
                    END
                ), 0),
                0
            ) AS avg_cost,
            MAX(t.currency) AS avg_cost_ccy,
            NOW()
        FROM transactions t
        GROUP BY t.account_id, t.company_id
        HAVING SUM(
            CASE
                WHEN t.transaction_type IN (
                    'BUY'::transactiontype,
                    'DEPOSIT'::transactiontype,
                    'DIVIDEND'::transactiontype,
                    'INTEREST'::transactiontype
                ) THEN t.quantity
                WHEN t.transaction_type IN (
                    'SELL'::transactiontype,
                    'WITHDRAWAL'::transactiontype,
                    'FEE'::transactiontype,
                    'TAX'::transactiontype
                ) THEN -t.quantity
                ELSE 0
            END
        ) <> 0;
    """)



def downgrade() -> None:
    op.drop_index("ix_positions_company_id", table_name="positions")
    op.drop_index("ix_positions_account_id", table_name="positions")
    op.drop_table("positions")
