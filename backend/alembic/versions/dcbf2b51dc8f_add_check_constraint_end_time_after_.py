"""add check constraint end time after start time on flow

Revision ID: dcbf2b51dc8f
Revises: 7e0ccd54ee91
Create Date: 2026-04-22 10:44:09.131562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dcbf2b51dc8f'
down_revision: Union[str, Sequence[str], None] = '7e0ccd54ee91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint("ck_flow_end_after_start", "flow", "end_time > start_time")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_flow_end_after_start", "flow", type_="check")
