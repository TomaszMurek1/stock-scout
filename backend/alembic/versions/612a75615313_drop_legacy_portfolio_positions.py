from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "612a75615313"
down_revision = "cafb260be8b5"
branch_labels = None
depends_on = None

def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if insp.has_table("portfolio_positions", schema=None):
        op.drop_table("portfolio_positions")

def downgrade() -> None:
    # Re-create minimal version of the legacy table so downgrade doesn’t fail.
    op.create_table(
        "portfolio_positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("portfolios.id"), nullable=False),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.company_id"), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("average_cost", sa.Numeric(18, 4), nullable=False, server_default="0"),
        sa.Column("last_updated", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("portfolio_id", "company_id", name="uq_portfolio_positions_portfolio_company"),
    )
