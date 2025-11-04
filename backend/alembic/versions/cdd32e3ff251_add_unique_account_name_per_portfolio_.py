from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "cdd32e3ff251"
down_revision = "fc0bc19054ba"
branch_labels = None
depends_on = None

def upgrade():
    # 1) Unique constraint on (portfolio_id, name)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    # Add constraint only if not present
    existing = [uc["name"] for uc in inspector.get_unique_constraints("accounts")]
    if "uq_account_portfolio_name" not in existing:
        op.create_unique_constraint(
            "uq_account_portfolio_name",
            "accounts",
            ["portfolio_id", "name"],
        )

    # 2) Seed a 'Default' account per existing portfolio
    #    (idempotent: skip if portfolio already has an account named 'Default')
    op.execute("""
        INSERT INTO accounts (portfolio_id, name, account_type, currency, created_at)
        SELECT p.id, 'Default', 'brokerage', p.currency, NOW()
        FROM portfolios p
        WHERE NOT EXISTS (
            SELECT 1 FROM accounts a
            WHERE a.portfolio_id = p.id AND a.name = 'Default'
        )
    """)

def downgrade():
    # Best-effort: drop any 'Default' accounts that have no transactions (we don’t link tx yet)
    op.execute("""
        DELETE FROM accounts a
        WHERE a.name = 'Default'
          AND NOT EXISTS (
              SELECT 1 FROM transactions t WHERE t.portfolio_id = a.portfolio_id
          )
    """)

    # Drop the unique constraint
    op.drop_constraint("uq_account_portfolio_name", "accounts", type_="unique")
