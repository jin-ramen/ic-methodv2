"""drop booking attended

Revision ID: a9c5e2d81b06
Revises: f3a2b1c04d87
Create Date: 2026-04-27 00:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a9c5e2d81b06'
down_revision: Union[str, Sequence[str], None] = 'f3a2b1c04d87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('booking', 'attended')


def downgrade() -> None:
    op.add_column('booking', sa.Column('attended', sa.Boolean(), nullable=False, server_default='false'))
