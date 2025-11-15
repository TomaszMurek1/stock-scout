from alembic import op

revision: str = '5e7f6a01b509'
down_revision = '1ef8d760e1b8'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'TRANSFER_IN'")
    op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'TRANSFER_OUT'")

def downgrade():
    # PostgreSQL can't easily remove enum values — so we leave them.
    pass
