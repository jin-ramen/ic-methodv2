"""add unique constraint on session instructor + start_time

Revision ID: b7e3c9d02f81
Revises: a3f8d2c91b04
Create Date: 2026-04-26

"""
from alembic import op

revision = 'b7e3c9d02f81'
down_revision = 'a3f8d2c91b04'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Delete bookings on duplicate sessions before removing those sessions
    op.execute("""
        DELETE FROM booking
        WHERE session_id IN (
            SELECT id FROM session
            WHERE id NOT IN (
                SELECT DISTINCT ON (instructor, start_time) id
                FROM session
                ORDER BY instructor, start_time, created_at ASC
            )
        )
    """)
    op.execute("""
        DELETE FROM session
        WHERE id NOT IN (
            SELECT DISTINCT ON (instructor, start_time) id
            FROM session
            ORDER BY instructor, start_time, created_at ASC
        )
    """)
    op.create_unique_constraint(
        "uq_session_instructor_start_time",
        "session",
        ["instructor", "start_time"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_session_instructor_start_time", "session", type_="unique")
