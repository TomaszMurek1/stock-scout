"""deduplicate financials and add constraint

Revision ID: b1c2d3e4f5a6
Revises: a053e3ff0ea8
Create Date: 2025-12-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = 'a053e3ff0ea8'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Deduplicate company_financials
    # We want to keep exactly one record per company_id (the one with highest ID, assuming it's the latest)
    # The subquery trick is needed for MySQL/some versions of SQL to avoid "can't specify target table for update in FROM clause"
    
    op.execute("""
        DELETE FROM company_financials 
        WHERE financials_id NOT IN (
            SELECT max_id FROM (
                SELECT MAX(financials_id) as max_id 
                FROM company_financials 
                GROUP BY company_id
            ) as keep_rows
        )
    """)
    
    # 2. Add unique constraint
    # Note: SQLite has limited support for ALTER TABLE ADD CONSTRAINT, but Alembic handles batch operations if configured.
    # If simple op.create_unique_constraint fails on SQLite, we might need batch mode, 
    # but for Postgres this is standard.
    try:
        op.create_unique_constraint('uq_company_financials_company_id', 'company_financials', ['company_id'])
    except Exception:
        # Fallback for SQLite if needed, though usually create_unique_constraint might fail if not batch mode
        with op.batch_alter_table("company_financials") as batch_op:
            batch_op.create_unique_constraint('uq_company_financials_company_id', ['company_id'])


def downgrade():
    try:
        op.drop_constraint('uq_company_financials_company_id', 'company_financials', type_='unique')
    except Exception:
        with op.batch_alter_table("company_financials") as batch_op:
            batch_op.drop_constraint('uq_company_financials_company_id', type_='unique')
