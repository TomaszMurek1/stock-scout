from alembic import op
import sqlalchemy as sa

revision: str = '1ef8d760e1b8'
down_revision = '612a75615313'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column(
        "transactions",
        "company_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

def downgrade():
    op.alter_column(
        "transactions",
        "company_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
