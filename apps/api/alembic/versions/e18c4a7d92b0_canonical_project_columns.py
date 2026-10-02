"""Promote VNext custom columns to project-scoped definitions and values.

Revision ID: e18c4a7d92b0
Revises: d72a81e5c409

This upgrades VNext schema history only, never connects to Legacy databases.
Existing definition/value identities survive; invalid cross-project rows fail
constraint validation rather than being discarded or silently reassigned.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "e18c4a7d92b0"
down_revision = "d72a81e5c409"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pg = op.get_context().dialect.name == "postgresql"
    # Remove incoming constraints before batch reconstruction in SQLite fixtures.
    with op.batch_alter_table("shot_custom_field_values") as batch:
        batch.drop_constraint("fk_shot_custom_field_values_shot_id_shots", type_="foreignkey")
        batch.drop_constraint(op.f("fk_shot_custom_field_values_field_definition_id_custom_field_definitions"), type_="foreignkey")
    op.rename_table("custom_field_definitions", "project_columns")
    op.rename_table("shot_custom_field_values", "shot_column_values")
    with op.batch_alter_table("shots") as batch:
        batch.create_unique_constraint("uq_shots_production_id", ["production_id", "id"])

    with op.batch_alter_table("project_columns") as batch:
        batch.add_column(sa.Column("origin", sa.String(16), nullable=False, server_default="custom"))
        batch.add_column(sa.Column("binding_kind", sa.String(16), nullable=False, server_default="custom"))
        batch.add_column(sa.Column("binding_key", sa.String(120), nullable=True))
        batch.add_column(sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("state", sa.String(16), nullable=False, server_default="active"))
        batch.add_column(sa.Column("deleted_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("purged_at", sa.DateTime(), nullable=True))
    op.execute("""UPDATE project_columns SET state = CASE
        WHEN is_purged THEN 'purged'
        WHEN NOT is_active OR EXISTS (SELECT 1 FROM column_preferences p
          WHERE p.production_id = project_columns.production_id
          AND p.column_key = 'custom:' || project_columns.key AND p.state = 'removed') THEN 'trashed'
        ELSE 'active' END""")
    op.execute("UPDATE project_columns SET deleted_at = updated_at WHERE state IN ('trashed','purged')")
    op.execute("""UPDATE project_columns SET purged_at = updated_at, label = '',
        description = '', group_name = '', options = '[]', default_value = NULL,
        required = false WHERE state = 'purged'""")
    # ColumnPreference is presentation only for canonical custom definitions.
    op.execute("""DELETE FROM column_preferences WHERE EXISTS
        (SELECT 1 FROM project_columns c WHERE c.production_id = column_preferences.production_id
         AND column_preferences.column_key = 'custom:' || c.key AND c.state = 'purged')""")
    op.execute("""UPDATE column_preferences SET state = 'hidden', permanently_deleted = false
        WHERE state = 'removed' AND EXISTS (SELECT 1 FROM project_columns c
        WHERE c.production_id = column_preferences.production_id
        AND column_preferences.column_key = 'custom:' || c.key)""")
    for suffix in ("production_id", "field_type", "sort_index", "is_active", "is_purged"):
        op.drop_index("ix_custom_field_definitions_" + suffix, table_name="project_columns")
    with op.batch_alter_table("project_columns") as batch:
        batch.drop_constraint("uq_custom_field_definitions_production_key", type_="unique")
        batch.drop_constraint("fk_custom_field_definitions_production_id_productions", type_="foreignkey")
        batch.drop_column("is_active")
        batch.drop_column("is_purged")
        batch.alter_column("revision", existing_type=sa.Integer(), type_=sa.BigInteger())
        if pg:
            for column in ("options", "default_value"):
                batch.alter_column(column, existing_type=sa.JSON(), type_=JSONB(), postgresql_using=column + "::jsonb")
        batch.create_unique_constraint("uq_project_columns_production_key", ["production_id", "key"])
        batch.create_unique_constraint("uq_project_columns_production_id", ["production_id", "id"])
        batch.create_unique_constraint("uq_project_columns_binding_identity", ["production_id", "id", "binding_kind"])
        batch.create_foreign_key("fk_project_columns_production_id_productions", "productions", ["production_id"], ["id"], ondelete="RESTRICT")
        for name, condition in (
            ("origin", "origin IN ('builtin','preset','custom','import')"),
            ("binding_kind", "binding_kind IN ('entity','derived','custom','pending')"),
            ("state", "state IN ('active','trashed','purging','purged')"),
            ("versions", "revision > 0 AND schema_version > 0"),
            ("purged_timestamp", "(state = 'purged') = (purged_at IS NOT NULL)"),
            ("deleted_timestamp", "state NOT IN ('trashed','purging') OR deleted_at IS NOT NULL"),
            ("purged_metadata", "state <> 'purged' OR (label = '' AND description = '' AND group_name = '' AND required = false)"),
        ):
            batch.create_check_constraint(op.f("ck_project_columns_" + name), condition)
    for suffix in ("production_id", "field_type", "sort_index"):
        op.create_index("ix_project_columns_" + suffix, "project_columns", [suffix])
    op.create_index("ix_project_columns_state", "project_columns", ["production_id", "state"])
    predicate = sa.text("binding_key IS NOT NULL AND binding_kind <> 'pending' AND state <> 'purged'")
    op.create_index("uq_project_columns_live_binding", "project_columns", ["production_id", "binding_key"], unique=True, postgresql_where=predicate, sqlite_where=predicate)

    with op.batch_alter_table("shot_column_values") as batch:
        batch.alter_column("field_definition_id", new_column_name="column_id", existing_type=sa.String())
        batch.add_column(sa.Column("production_id", sa.String(), nullable=True))
        batch.add_column(sa.Column("binding_kind", sa.String(16), nullable=False, server_default="custom"))
    op.execute("""UPDATE shot_column_values SET production_id =
        (SELECT production_id FROM shots WHERE shots.id = shot_column_values.shot_id)""")
    # Old purge code kept only tombstones; remove any impossible stale values.
    op.execute("DELETE FROM shot_column_values WHERE column_id IN (SELECT id FROM project_columns WHERE state = 'purged')")
    for suffix in ("shot_id", "field_definition_id"):
        op.drop_index("ix_shot_custom_field_values_" + suffix, table_name="shot_column_values")
    with op.batch_alter_table("shot_column_values") as batch:
        batch.alter_column("production_id", existing_type=sa.String(), nullable=False)
        if pg:
            batch.alter_column("value", existing_type=sa.JSON(), type_=JSONB(), postgresql_using="value::jsonb")
        batch.drop_constraint("uq_shot_custom_field_values_shot_field", type_="unique")
        batch.create_unique_constraint("uq_shot_column_values_shot_column", ["shot_id", "column_id"])
        batch.create_foreign_key("fk_shot_column_values_project_shot", "shots", ["production_id", "shot_id"], ["production_id", "id"], ondelete="RESTRICT")
        batch.create_foreign_key("fk_shot_column_values_project_column", "project_columns", ["production_id", "column_id", "binding_kind"], ["production_id", "id", "binding_kind"], ondelete="RESTRICT")
        batch.create_check_constraint(op.f("ck_shot_column_values_custom_binding"), "binding_kind = 'custom'")
    for suffix in ("shot_id", "column_id"):
        op.create_index("ix_shot_column_values_" + suffix, "shot_column_values", [suffix])
    op.create_index("ix_column_values_lookup", "shot_column_values", ["production_id", "column_id", "shot_id"])


def downgrade() -> None:
    # Once native entity/derived columns exist, older code cannot represent them.
    if op.get_context().as_sql:
        raise RuntimeError("Downgrade requires an isolated online database and scope validation")
    unsupported = op.get_bind().execute(sa.text("SELECT 1 FROM project_columns WHERE binding_kind <> 'custom' OR state = 'purging' LIMIT 1")).first()
    if unsupported:
        raise RuntimeError("Native column data cannot be represented by the previous schema")
    pg = op.get_context().dialect.name == "postgresql"
    op.drop_index("ix_column_values_lookup", table_name="shot_column_values")
    with op.batch_alter_table("shot_column_values") as batch:
        batch.drop_constraint("fk_shot_column_values_project_shot", type_="foreignkey")
        batch.drop_constraint("fk_shot_column_values_project_column", type_="foreignkey")
        batch.drop_constraint(op.f("ck_shot_column_values_custom_binding"), type_="check")
        batch.drop_constraint("uq_shot_column_values_shot_column", type_="unique")
        batch.create_unique_constraint("uq_shot_custom_field_values_shot_field", ["shot_id", "column_id"])
        batch.drop_column("production_id")
        batch.drop_column("binding_kind")
        if pg:
            batch.alter_column("value", existing_type=JSONB(), type_=sa.JSON(), postgresql_using="value::json")
    for suffix in ("shot_id", "column_id"):
        op.drop_index("ix_shot_column_values_" + suffix, table_name="shot_column_values")
    with op.batch_alter_table("project_columns") as batch:
        batch.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column("is_purged", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE project_columns SET is_active = state = 'active', is_purged = state = 'purged'")
    op.execute("""UPDATE column_preferences SET state = 'removed' WHERE EXISTS
        (SELECT 1 FROM project_columns c WHERE c.production_id = column_preferences.production_id
         AND column_preferences.column_key = 'custom:' || c.key AND c.state = 'trashed')""")
    op.drop_index("ix_project_columns_state", table_name="project_columns")
    op.drop_index("uq_project_columns_live_binding", table_name="project_columns")
    for suffix in ("production_id", "field_type", "sort_index"):
        op.drop_index("ix_project_columns_" + suffix, table_name="project_columns")
    with op.batch_alter_table("project_columns") as batch:
        for name in ("origin", "binding_kind", "state", "versions", "purged_timestamp", "deleted_timestamp", "purged_metadata"):
            batch.drop_constraint(op.f("ck_project_columns_" + name), type_="check")
        for name in ("uq_project_columns_production_key", "uq_project_columns_production_id", "uq_project_columns_binding_identity"):
            batch.drop_constraint(name, type_="unique")
        batch.drop_constraint("fk_project_columns_production_id_productions", type_="foreignkey")
        batch.create_foreign_key("fk_custom_field_definitions_production_id_productions", "productions", ["production_id"], ["id"], ondelete="CASCADE")
        batch.create_unique_constraint("uq_custom_field_definitions_production_key", ["production_id", "key"])
        batch.alter_column("revision", existing_type=sa.BigInteger(), type_=sa.Integer())
        if pg:
            for column in ("options", "default_value"):
                batch.alter_column(column, existing_type=JSONB(), type_=sa.JSON(), postgresql_using=column + "::json")
        for name in ("origin", "binding_kind", "binding_key", "schema_version", "state", "deleted_at", "purged_at"):
            batch.drop_column(name)
    op.rename_table("project_columns", "custom_field_definitions")
    with op.batch_alter_table("shot_column_values") as batch:
        batch.alter_column("column_id", new_column_name="field_definition_id", existing_type=sa.String())
        batch.create_foreign_key("fk_shot_custom_field_values_shot_id_shots", "shots", ["shot_id"], ["id"], ondelete="CASCADE")
        batch.create_foreign_key(op.f("fk_shot_custom_field_values_field_definition_id_custom_field_definitions"), "custom_field_definitions", ["column_id"], ["id"], ondelete="CASCADE")
    op.rename_table("shot_column_values", "shot_custom_field_values")
    for suffix in ("production_id", "field_type", "sort_index", "is_active", "is_purged"):
        op.create_index("ix_custom_field_definitions_" + suffix, "custom_field_definitions", [suffix])
    for suffix in ("shot_id", "field_definition_id"):
        op.create_index("ix_shot_custom_field_values_" + suffix, "shot_custom_field_values", [suffix])
    with op.batch_alter_table("shots") as batch:
        batch.drop_constraint("uq_shots_production_id", type_="unique")
