"""add session_rule and session.rule_id/rule_index

Revision ID: b9c4d1e7f203
Revises: a1b2c3d4e5f6
Create Date: 2026-04-29 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'b9c4d1e7f203'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'session_rule',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('frequency', sa.String(16), nullable=False),
        sa.Column('interval', sa.Integer, nullable=False, server_default='1'),
        sa.Column('count', sa.Integer, nullable=True),
        sa.Column('until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column('session', sa.Column('rule_id', UUID(as_uuid=True), sa.ForeignKey('session_rule.id', ondelete='SET NULL'), nullable=True))
    op.add_column('session', sa.Column('rule_index', sa.Integer, nullable=True))
    op.create_index('ix_session_rule_id', 'session', ['rule_id'])


def downgrade() -> None:
    op.drop_index('ix_session_rule_id', table_name='session')
    op.drop_column('session', 'rule_index')
    op.drop_column('session', 'rule_id')
    op.drop_table('session_rule')
