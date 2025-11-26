"""remove company_notes unique constraint

Revision ID: 6f1a2b3c4d5e
Revises: d3cfe3f3b8c4
Create Date: 2025-11-26 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1a2b3c4d5e'
down_revision: Union[str, None] = 'd3cfe3f3b8c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the unique constraint on (user_id, company_id)
    op.drop_constraint('uq_company_notes_user_company', 'company_notes', type_='unique')


def downgrade() -> None:
    # Re-add the unique constraint
    op.create_unique_constraint('uq_company_notes_user_company', 'company_notes', ['user_id', 'company_id'])
