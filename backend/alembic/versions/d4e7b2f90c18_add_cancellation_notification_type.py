"""add cancellation notification type

Revision ID: d4e7b2f90c18
Revises: b2e770f64dbc
Create Date: 2026-04-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'd4e7b2f90c18'
down_revision: Union[str, Sequence[str], None] = 'b2e770f64dbc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CANCELLATION'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op.
    pass
