"""purchase order item improvements

Revision ID: a92e5e217734
Revises: 85a87343837f
Create Date: 2026-08-03 18:54:19.562075

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a92e5e217734'
down_revision: Union[str, Sequence[str], None] = '85a87343837f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: purchase-order-item fields already exist in earlier migrations."""
    pass


def downgrade() -> None:
    """No-op."""
    pass