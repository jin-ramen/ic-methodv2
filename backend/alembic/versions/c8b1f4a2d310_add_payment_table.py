"""add payment table

Revision ID: c8b1f4a2d310
Revises: f5d3e2b1a0c9
Create Date: 2026-04-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'c8b1f4a2d310'
down_revision: Union[str, Sequence[str], None] = 'f5d3e2b1a0c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'payment',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('booking_id', UUID(as_uuid=True), sa.ForeignKey('booking.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('user.id', ondelete='SET NULL'), nullable=True),
        sa.Column('payment_intent_id', sa.String(225), nullable=True),
        sa.Column('client_secret', sa.String(512), nullable=True),
        sa.Column('request_id', sa.String(64), nullable=False),
        sa.Column('merchant_order_id', sa.String(64), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='AUD'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_unique_constraint('uq_payment_booking_id', 'payment', ['booking_id'])
    op.create_unique_constraint('uq_payment_payment_intent_id', 'payment', ['payment_intent_id'])
    op.create_unique_constraint('uq_payment_request_id', 'payment', ['request_id'])
    op.create_unique_constraint('uq_payment_merchant_order_id', 'payment', ['merchant_order_id'])
    op.create_index('ix_payment_booking_id', 'payment', ['booking_id'])
    op.create_index('ix_payment_user_id', 'payment', ['user_id'])
    op.create_index('ix_payment_payment_intent_id', 'payment', ['payment_intent_id'])
    op.create_index('ix_payment_request_id', 'payment', ['request_id'])
    op.create_index('ix_payment_merchant_order_id', 'payment', ['merchant_order_id'])


def downgrade() -> None:
    op.drop_index('ix_payment_merchant_order_id', table_name='payment')
    op.drop_index('ix_payment_request_id', table_name='payment')
    op.drop_index('ix_payment_payment_intent_id', table_name='payment')
    op.drop_index('ix_payment_user_id', table_name='payment')
    op.drop_index('ix_payment_booking_id', table_name='payment')
    op.drop_table('payment')
