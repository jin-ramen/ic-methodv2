"""add refund fields to payment

Revision ID: a1b2c3d4e5f6
Revises: e3f0c7a9b842
Create Date: 2026-04-29 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e3f0c7a9b842'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payment', sa.Column('refund_id', sa.String(64), nullable=True))
    op.add_column('payment', sa.Column('refund_amount', sa.Numeric(10, 2), nullable=True))
    op.add_column('payment', sa.Column('refunded_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('payment', 'refunded_at')
    op.drop_column('payment', 'refund_amount')
    op.drop_column('payment', 'refund_id')