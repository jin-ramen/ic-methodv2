"""drop commitment flow_id index

Revision ID: a1b2c3d4e5f6
Revises: 18b4b85760f8
Create Date: 2026-04-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '61c18b5ddece'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index('ix_commitment_flow_id', table_name='commitment')


def downgrade() -> None:
    op.create_index('ix_commitment_flow_id', 'commitment', ['flow_id'], unique=False)