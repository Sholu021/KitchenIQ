"""Add organization trial expiry tracking.

Revision ID: trial_20260928
Revises: billing_webhook_events_20260926
"""
from alembic import op
import sqlalchemy as sa

revision = "trial_20260928"
down_revision = "billing_webhook_events_20260926"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "organizations",
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("organizations", "trial_ends_at")
