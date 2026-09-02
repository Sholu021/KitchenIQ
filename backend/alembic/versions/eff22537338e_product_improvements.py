"""product improvements

Revision ID: eff22537338e
Revises: 33c4ac82aef6
Create Date: 2026-08-03 18:48:39.438709
"""

from typing import Sequence, Union


revision: str = "eff22537338e"
down_revision: Union[str, Sequence[str], None] = "33c4ac82aef6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: product changes were already applied by earlier migrations."""
    pass


def downgrade() -> None:
    """No-op."""
    pass