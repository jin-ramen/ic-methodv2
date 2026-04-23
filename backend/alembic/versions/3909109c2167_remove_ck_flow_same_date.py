"""remove ck_flow_same_date

Revision ID: 3909109c2167
Revises: b25b981cc4c9
Create Date: 2026-04-23 13:23:09.340031

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3909109c2167'
down_revision: Union[str, Sequence[str], None] = 'b25b981cc4c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('ck_flow_same_date', 'flow', type_='check')


def downgrade() -> None:
    """Downgrade schema."""
    pass
