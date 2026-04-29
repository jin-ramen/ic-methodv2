"""extend booking active uniqueness to pending_payment

Revision ID: e3f0c7a9b842
Revises: d7a2e9f4b531
Create Date: 2026-04-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e3f0c7a9b842'
down_revision: Union[str, Sequence[str], None] = 'd7a2e9f4b531'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("uq_booking_active_session_user", table_name="booking")
    op.create_index(
        "uq_booking_active_session_user",
        "booking",
        ["session_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('booked','pending_payment') AND user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_booking_active_session_user", table_name="booking")
    op.create_index(
        "uq_booking_active_session_user",
        "booking",
        ["session_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'booked' AND user_id IS NOT NULL"),
    )
