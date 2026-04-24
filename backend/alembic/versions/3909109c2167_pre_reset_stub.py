"""pre-reset stub

Revision ID: 3909109c2167
Revises:
Create Date: 2026-04-24

This stub exists so that existing production databases with this revision
recorded can upgrade to the initial_reset migration (37138291b953).
"""
from typing import Sequence, Union

revision: str = '3909109c2167'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
