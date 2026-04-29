"""add invoice_sent_at to payment

Revision ID: d7a2e9f4b531
Revises: c8b1f4a2d310
Create Date: 2026-04-29 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd7a2e9f4b531'
down_revision: Union[str, Sequence[str], None] = 'c8b1f4a2d310'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payment', sa.Column('invoice_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('payment', 'invoice_sent_at')
