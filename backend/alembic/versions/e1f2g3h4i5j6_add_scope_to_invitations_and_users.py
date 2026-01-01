"""add scope to invitations and users

Revision ID: e1f2g3h4i5j6
Revises: 7d72dfc9d18b
Create Date: 2026-01-01 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1f2g3h4i5j6"
down_revision = "7d72dfc9d18b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # Drop the existing enum type if it exists (safer approach for development)
    connection.execute(sa.text("DROP TYPE IF EXISTS userscope CASCADE"))
    
    # Create the enum type
    connection.execute(sa.text(
        "CREATE TYPE userscope AS ENUM ('admin', 'paid_access', 'basic_access', 'read_only')"
    ))
    
    # Add scope column to invitations table
    connection.execute(sa.text(
        "ALTER TABLE invitations ADD COLUMN scope userscope NOT NULL DEFAULT 'basic_access'"
    ))
    # Remove default after adding
    connection.execute(sa.text(
        "ALTER TABLE invitations ALTER COLUMN scope DROP DEFAULT"
    ))
    
    # Add scope column to users table
    connection.execute(sa.text(
        "ALTER TABLE users ADD COLUMN scope userscope NOT NULL DEFAULT 'basic_access'"
    ))
    # Remove default after adding
    connection.execute(sa.text(
        "ALTER TABLE users ALTER COLUMN scope DROP DEFAULT"
    ))


def downgrade() -> None:
    # Drop scope columns
    op.drop_column("users", "scope")
    op.drop_column("invitations", "scope")
    
    # Drop enum type
    connection = op.get_bind()
    connection.execute(sa.text("DROP TYPE IF EXISTS userscope CASCADE"))
