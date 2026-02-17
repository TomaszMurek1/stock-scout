"""add_user_alert_preferences_table

Revision ID: 0dbde969e01a
Revises: 2cac58a5785b
Create Date: 2026-02-17 07:16:59.195908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0dbde969e01a'
down_revision: Union[str, None] = '2cac58a5785b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_alert_preferences table."""
    op.create_table(
        'user_alert_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('sma50_cross_above', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma50_cross_below', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma200_cross_above', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma200_cross_below', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma50_distance_25', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma50_distance_50', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma200_distance_25', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sma200_distance_50', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_sma_alerts_sent', sa.Text(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_user_alert_preferences_id', 'user_alert_preferences', ['id'])


def downgrade() -> None:
    """Drop user_alert_preferences table."""
    op.drop_index('ix_user_alert_preferences_id', table_name='user_alert_preferences')
    op.drop_table('user_alert_preferences')
