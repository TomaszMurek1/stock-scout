"""fix_portfolio_metrics_existing_tables

Revision ID: ff7d90ada8e9
Revises: c8e67e341fba
Create Date: 2025-11-11 10:52:38.343141

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff7d90ada8e9'
down_revision: Union[str, None] = 'c8e67e341fba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Only make company_id nullable - skip creating portfolio_returns since it exists
    op.alter_column('transactions', 'company_id',
               existing_type=sa.INTEGER(),
               nullable=True)

def downgrade():
    op.alter_column('transactions', 'company_id',
               existing_type=sa.INTEGER(),
               nullable=False)