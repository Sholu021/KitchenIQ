"""batch improvements

Revision ID: 33c4ac82aef6
Revises: 8126e75f5e6e
Create Date: 2026-08-03 18:46:31.344926
"""

from typing import Sequence, Union


revision: str = "33c4ac82aef6"
down_revision: Union[str, Sequence[str], None] = "8126e75f5e6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: batch changes were already applied by earlier migration 47d6cb1af479."""
    pass


def downgrade() -> None:
    """No-op."""
    pass