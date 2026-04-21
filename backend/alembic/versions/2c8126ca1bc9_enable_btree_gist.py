"""enable btree-gist

Revision ID: 2c8126ca1bc9
Revises: 
Create Date: 2026-04-21 11:05:01.259594

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c8126ca1bc9'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

def downgrade():
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
