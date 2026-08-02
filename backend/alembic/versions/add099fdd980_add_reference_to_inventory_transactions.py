"""add reference to inventory transactions

Revision ID: add099fdd980
Revises: 506bad9388e5
Create Date: 2026-07-31 09:47:57.913740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add099fdd980'
down_revision: Union[str, Sequence[str], None] = '506bad9388e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "inventory_transactions",
        sa.Column("reference", sa.String(100), nullable=True),
    )

def downgrade():
    op.drop_column("inventory_transactions", "reference")