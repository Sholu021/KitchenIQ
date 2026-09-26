"""add billing webhook event table

Revision ID: billing_webhook_events_20260926
Revises: billing_subscriptions_20260926
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "billing_webhook_events_20260926"
down_revision: Union[str, Sequence[str], None] = "billing_subscriptions_20260926"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("billing_webhook_events"):
        return

    op.create_table(
        "billing_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(length=100), nullable=False),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column("subscription_id", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="received"),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index(
        "ix_billing_webhook_events_event_id",
        "billing_webhook_events",
        ["event_id"],
    )
    op.create_index(
        "ix_billing_webhook_events_subscription_id",
        "billing_webhook_events",
        ["subscription_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_billing_webhook_events_subscription_id",
        table_name="billing_webhook_events",
    )
    op.drop_index(
        "ix_billing_webhook_events_event_id",
        table_name="billing_webhook_events",
    )
    op.drop_table("billing_webhook_events")
