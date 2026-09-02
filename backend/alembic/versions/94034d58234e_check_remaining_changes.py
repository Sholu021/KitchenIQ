"""check remaining changes

Revision ID: 94034d58234e
Revises: a92e5e217734
Create Date: 2026-08-03 19:02:00.289487
"""

from typing import Sequence, Union


revision: str = "94034d58234e"
down_revision: Union[str, Sequence[str], None] = "a92e5e217734"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op: all schema changes are already represented by earlier migrations."""
    pass


def downgrade() -> None:
    """No-op."""
    pass