"""add booking attended

Revision ID: f3a2b1c04d87
Revises: e1f9a3d72c05
Create Date: 2026-04-27 00:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f3a2b1c04d87'
down_revision: Union[str, Sequence[str], None] = 'e1f9a3d72c05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('booking', sa.Column('attended', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('booking', 'attended')
