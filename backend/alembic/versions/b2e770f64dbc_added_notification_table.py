"""added notification table

Revision ID: b2e770f64dbc
Revises: 17c570787783
Create Date: 2026-04-27 11:29:00.232889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2e770f64dbc'
down_revision: Union[str, Sequence[str], None] = '17c570787783'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ...existing code...

def upgrade() -> None:
    """Upgrade schema."""
    # create enum types first
    notification_status = postgresql.ENUM(
        "PENDING", "SENT", "FAILED",
        name="notification_status",
    )
    notification_type = postgresql.ENUM(
        "CONFIRMATION", "REMINDER", "OTHERS",
        name="notification_type",
    )
    notification_status.create(op.get_bind(), checkfirst=True)
    notification_type.create(op.get_bind(), checkfirst=True)

    op.add_column("notification", sa.Column("send_at", sa.DateTime(timezone=True), nullable=False))
    op.add_column("notification", sa.Column("error_message", sa.String(length=500), nullable=True))

    # drop old varchar defaults before type change
    op.alter_column("notification", "status", server_default=None)
    op.alter_column("notification", "type", server_default=None)

    # cast existing lowercase text values to uppercase enum labels
    op.alter_column(
        "notification",
        "status",
        existing_type=sa.VARCHAR(length=20),
        type_=notification_status,
        existing_nullable=False,
        postgresql_using="upper(status)::notification_status",
    )
    op.alter_column(
        "notification",
        "type",
        existing_type=sa.VARCHAR(length=20),
        type_=notification_type,
        existing_nullable=False,
        postgresql_using="upper(type)::notification_type",
    )

    op.alter_column(
        "notification",
        "sent_at",
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=True,
    )

    op.alter_column("notification", "status", server_default=sa.text("'PENDING'::notification_status"))
    op.alter_column("notification", "type", server_default=sa.text("'OTHERS'::notification_type"))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("notification", "status", server_default=None)
    op.alter_column("notification", "type", server_default=None)

    op.alter_column(
        "notification",
        "sent_at",
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=False,
    )
    op.alter_column(
        "notification",
        "type",
        existing_type=postgresql.ENUM("CONFIRMATION", "REMINDER", "OTHERS", name="notification_type"),
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
        postgresql_using="lower(type::text)",
    )
    op.alter_column(
        "notification",
        "status",
        existing_type=postgresql.ENUM("PENDING", "SENT", "FAILED", name="notification_status"),
        type_=sa.VARCHAR(length=20),
        existing_nullable=False,
        postgresql_using="lower(status::text)",
    )

    op.alter_column("notification", "status", server_default=sa.text("'pending'::character varying"))
    op.alter_column("notification", "type", server_default=sa.text("'others'::character varying"))

    op.drop_column("notification", "error_message")
    op.drop_column("notification", "send_at")

    postgresql.ENUM(name="notification_type").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="notification_status").drop(op.get_bind(), checkfirst=True)