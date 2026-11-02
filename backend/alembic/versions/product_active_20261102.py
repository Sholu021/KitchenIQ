"""Add product active status.

Revision ID: product_active_20261102
Revises: trial_20260928
"""
from alembic import op
import sqlalchemy as sa

revision = "product_active_20261102"
down_revision = "trial_20260928"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "products",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade():
    op.drop_column("products", "is_active")
