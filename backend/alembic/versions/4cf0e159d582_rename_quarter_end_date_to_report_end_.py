"""Rename quarter_end_date to report_end_date

Revision ID: 4cf0e159d582
Revises: 593bdf662ce2
Create Date: 2025-03-30 09:26:06.894966

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4cf0e159d582'
down_revision: Union[str, None] = '593bdf662ce2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Rename column in company_financial_history
    op.alter_column(
        'company_financial_history',
        'quarter_end_date',
        new_column_name='report_end_date'
    )

    # Rename column in company_financials
    op.alter_column(
        'company_financials',
        'most_recent_quarter',
        new_column_name='most_recent_report'
    )

    # If needed: recreate index under new column name
    op.drop_index('ix_company_financial_history_quarter_end_date', table_name='company_financial_history')
    op.create_index(
        op.f('ix_company_financial_history_report_end_date'),
        'company_financial_history',
        ['report_end_date'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'company_financial_history',
        'report_end_date',
        new_column_name='quarter_end_date'
    )

    op.alter_column(
        'company_financials',
        'most_recent_report',
        new_column_name='most_recent_quarter'
    )

    op.drop_index('ix_company_financial_history_report_end_date', table_name='company_financial_history')
    op.create_index(
        'ix_company_financial_history_quarter_end_date',
        'company_financial_history',
        ['quarter_end_date'],
        unique=False
    )