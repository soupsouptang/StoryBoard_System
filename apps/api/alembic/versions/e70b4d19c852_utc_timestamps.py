"""Store native VNext instants as timestamptz, interpreting old values as UTC.

Revision ID: e70b4d19c852
Revises: d6a93f08b241
"""
import sqlalchemy as sa
from alembic import op

revision = "e70b4d19c852"
down_revision = "d6a93f08b241"
branch_labels = None
depends_on = None

# Frozen schema at the predecessor; never import runtime metadata in migrations.
TABLES = (
    "approvals", "asset_versions", "assets", "audit_logs", "client_asset_requests",
    "column_preferences", "comment_events", "comment_read_states", "comments",
    "exports", "outbox_events", "panels", "production_steps", "productions",
    "project_branches", "project_columns", "project_commits", "roles", "saved_views",
    "scenes", "sequences", "shares", "shot_asset_links", "shot_column_values",
    "shot_versions", "shots", "stock_asset_metadata", "users", "view_row_layouts",
    "review_decisions",
)
EXTRA_COLUMNS = {
    "assets": ("deleted_at",),
    "client_asset_requests": ("requested_at", "received_at"),
    "comments": ("deleted_at",),
    "exports": ("completed_at",),
    "panels": ("deleted_at",),
    "production_steps": ("deleted_at",),
    "productions": ("deleted_at",),
    "project_columns": ("deleted_at", "purged_at"),
    "scenes": ("deleted_at",),
    "sequences": ("deleted_at",),
    "shares": ("expires_at", "revoked_at"),
    "shots": ("deleted_at",),
}


def _convert(timezone: bool):
    # SQLite remains an explicitly isolated fixture dialect; it has no timestamptz.
    if op.get_context().dialect.name != "postgresql":
        return
    for table in TABLES:
        for column in ("created_at", "updated_at", *EXTRA_COLUMNS.get(table, ())):
            op.alter_column(table, column, type_=sa.DateTime(timezone=timezone),
                existing_type=sa.DateTime(timezone=not timezone),
                postgresql_using=f"{column} AT TIME ZONE 'UTC'")


def upgrade():
    _convert(True)


def downgrade():
    _convert(False)
