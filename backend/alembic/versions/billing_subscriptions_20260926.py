"""add billing subscriptions table

Revision ID: billing_subscriptions_20260926
Revises: 94034d58234e
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "billing_subscriptions_20260926"
down_revision: Union[str, Sequence[str], None] = "94034d58234e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_subscriptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default="Pro"),
        sa.Column("billing_cycle", sa.String(length=20), nullable=False),
        sa.Column("razorpay_subscription_id", sa.String(length=100), nullable=False),
        sa.Column("payment_id", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("razorpay_subscription_id"),
    )
    op.create_index(
        "ix_billing_subscriptions_organization_id",
        "billing_subscriptions",
        ["organization_id"],
    )
    op.create_index(
        "ix_billing_subscriptions_user_id",
        "billing_subscriptions",
        ["user_id"],
    )
    op.create_index(
        "ix_billing_subscriptions_razorpay_subscription_id",
        "billing_subscriptions",
        ["razorpay_subscription_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_billing_subscriptions_razorpay_subscription_id",
        table_name="billing_subscriptions",
    )
    op.drop_index(
        "ix_billing_subscriptions_user_id",
        table_name="billing_subscriptions",
    )
    op.drop_index(
        "ix_billing_subscriptions_organization_id",
        table_name="billing_subscriptions",
    )
    op.drop_table("billing_subscriptions")
