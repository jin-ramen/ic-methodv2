"""add check constraint same date on flow

Revision ID: bfa6b8bc9159
Revises: dcbf2b51dc8f
Create Date: 2026-04-22 10:54:38.044654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bfa6b8bc9159'
down_revision: Union[str, Sequence[str], None] = 'dcbf2b51dc8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint("ck_flow_same_date", "flow", "end_time::date = start_time::date")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_flow_same_date", "flow", type_="check")
