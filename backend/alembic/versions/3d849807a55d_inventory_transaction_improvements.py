"""inventory transaction improvements

Revision ID: 3d849807a55d
Revises: eff22537338e
Create Date: 2026-08-03 18:50:24.440110

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d849807a55d'
down_revision: Union[str, Sequence[str], None] = 'eff22537338e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    """No-op: inventory transaction changes already exist in earlier migration(s)."""
    pass


def downgrade() -> None:
    """No-op."""
    pass