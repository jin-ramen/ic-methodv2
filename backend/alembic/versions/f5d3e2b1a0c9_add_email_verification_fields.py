"""add email verification fields to user

Revision ID: f5d3e2b1a0c9
Revises: e8aa9b7c1f12
Create Date: 2026-04-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f5d3e2b1a0c9'
down_revision: Union[str, Sequence[str], None] = 'e8aa9b7c1f12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('email_pending', sa.String(255), nullable=True))
    op.add_column('user', sa.Column('email_token', sa.String(64), nullable=True))
    op.add_column('user', sa.Column('email_token_expires', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_user_email_token', 'user', ['email_token'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_user_email_token', table_name='user')
    op.drop_column('user', 'email_token_expires')
    op.drop_column('user', 'email_token')
    op.drop_column('user', 'email_pending')
