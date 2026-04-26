"""add guest booking fields

Revision ID: a3f8d2c91b04
Revises: 7523524ec161
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a3f8d2c91b04'
down_revision: Union[str, Sequence[str], None] = '7523524ec161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('booking', 'user_id', nullable=True)
    op.add_column('booking', sa.Column('first_name', sa.String(255), nullable=True))
    op.add_column('booking', sa.Column('last_name', sa.String(255), nullable=True))
    op.add_column('booking', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('booking', sa.Column('phone', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('booking', 'phone')
    op.drop_column('booking', 'email')
    op.drop_column('booking', 'last_name')
    op.drop_column('booking', 'first_name')
    op.alter_column('booking', 'user_id', nullable=False)
