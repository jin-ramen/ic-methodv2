"""add booking status fields

Revision ID: e1f9a3d72c05
Revises: b7e3c9d02f81
Create Date: 2026-04-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e1f9a3d72c05'
down_revision: Union[str, Sequence[str], None] = 'b7e3c9d02f81'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('booking', sa.Column('status', sa.String(20), nullable=False, server_default='booked'))
    op.add_column('booking', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('booking', sa.Column('cancellation_type', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('booking', 'cancellation_type')
    op.drop_column('booking', 'cancelled_at')
    op.drop_column('booking', 'status')
