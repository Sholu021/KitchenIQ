"""purchase order improvements

Revision ID: 85a87343837f
Revises: 3d849807a55d
Create Date: 2026-08-03 18:52:12.151741

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85a87343837f'
down_revision: Union[str, Sequence[str], None] = '3d849807a55d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: purchase-order fields already exist in earlier migrations."""
    pass


def downgrade() -> None:
    """No-op."""
    pass