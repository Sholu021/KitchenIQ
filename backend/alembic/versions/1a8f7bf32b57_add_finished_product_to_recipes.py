"""add finished product to recipes

Revision ID: 1a8f7bf32b57
Revises: 0409a4705a3f
Create Date: 2026-07-29 18:29:59.876971

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a8f7bf32b57'
down_revision: Union[str, Sequence[str], None] = '0409a4705a3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "recipes",
        sa.Column(
            "finished_product_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_recipes_finished_product",
        "recipes",
        "products",
        ["finished_product_id"],
        ["id"],
    )


def downgrade():
    op.drop_constraint(
        "fk_recipes_finished_product",
        "recipes",
        type_="foreignkey",
    )

    op.drop_column(
        "recipes",
        "finished_product_id",
    )