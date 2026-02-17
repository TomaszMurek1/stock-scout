"""add_sma_auto_alert_types

Revision ID: b2f4a7c9d1e3
Revises: 0dbde969e01a
Create Date: 2026-02-17 09:14:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2f4a7c9d1e3'
down_revision: Union[str, None] = '0dbde969e01a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# New enum values for auto-generated SMA monitoring alerts
NEW_ALERT_TYPES = [
    'SMA_50_CROSS_ABOVE',
    'SMA_50_CROSS_BELOW',
    'SMA_200_CROSS_ABOVE',
    'SMA_200_CROSS_BELOW',
    'SMA_50_DISTANCE',
    'SMA_200_DISTANCE',
]


def upgrade() -> None:
    """Add new SMA alert type values to the alerttype enum."""
    for value in NEW_ALERT_TYPES:
        op.execute(f"ALTER TYPE alerttype ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    """
    PostgreSQL does not support removing values from an enum type.
    A full enum rebuild would be required to remove these values,
    but they are harmless to leave in place.
    """
    pass
