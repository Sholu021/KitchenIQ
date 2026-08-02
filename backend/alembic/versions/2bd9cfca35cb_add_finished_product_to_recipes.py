"""add finished product to recipes

Revision ID: 2bd9cfca35cb
Revises: 1a8f7bf32b57
Create Date: 2026-07-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "2bd9cfca35cb"
down_revision = "1a8f7bf32b57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Production changes
    op.add_column(
        "productions",
        sa.Column("produced_at", sa.DateTime(), nullable=True),
    )

    op.add_column(
        "productions",
        sa.Column("produced_by", sa.Integer(), nullable=True),
    )

    op.drop_constraint(
        "productions_created_by_fkey",
        "productions",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "fk_productions_produced_by_users",
        "productions",
        "users",
        ["produced_by"],
        ["id"],
    )

    op.execute(
        """
        UPDATE productions
        SET produced_at = created_at
        WHERE produced_at IS NULL
        """
    )

    op.execute(
        """
        UPDATE productions
        SET produced_by = created_by
        WHERE produced_by IS NULL
        """
    )

    op.alter_column(
        "productions",
        "produced_at",
        nullable=False,
    )

    op.drop_column("productions", "created_at")
    op.drop_column("productions", "created_by")

    # -------------------------------
    # Recipes
    # -------------------------------

    op.execute("""
        UPDATE recipes
        SET finished_product_id = (
            SELECT id
            FROM products
            WHERE products.organization_id = recipes.organization_id
            ORDER BY id
            LIMIT 1
        )
        WHERE finished_product_id IS NULL
    """)

    op.alter_column(
        "recipes",
        "finished_product_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:

    op.add_column(
        "productions",
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(),
            nullable=False,
        ),
    )

    op.add_column(
        "productions",
        sa.Column(
            "created_by",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.execute(
        """
        UPDATE productions
        SET created_at = produced_at
        """
    )

    op.execute(
        """
        UPDATE productions
        SET created_by = produced_by
        """
    )

    op.drop_constraint(
        "fk_productions_produced_by",
        "productions",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "productions_created_by_fkey",
        "productions",
        "users",
        ["created_by"],
        ["id"],
    )

    op.drop_column("productions", "produced_by")
    op.drop_column("productions", "produced_at")

    op.alter_column(
        "recipes",
        "finished_product_id",
        existing_type=sa.Integer(),
        nullable=True,
    )