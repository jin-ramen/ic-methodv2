"""allow rebook after cancellation

Revision ID: e8aa9b7c1f12
Revises: d4e7b2f90c18
Create Date: 2026-04-27 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8aa9b7c1f12"
down_revision: Union[str, Sequence[str], None] = "d4e7b2f90c18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Replace unconditional uniqueness with active-booking-only uniqueness.
    op.execute("ALTER TABLE booking DROP CONSTRAINT IF EXISTS uq_booking_session_user")
    op.create_index(
        "uq_booking_active_session_user",
        "booking",
        ["session_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'booked' AND user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_booking_active_session_user", table_name="booking")
    op.create_unique_constraint(
        "uq_booking_session_user",
        "booking",
        ["session_id", "user_id"],
    )
