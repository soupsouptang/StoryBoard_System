"""add custom field and column lifecycle

Revision ID: b4e7a21d9c60
Revises: 7ab3c5e91f20
Create Date: 2026-09-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4e7a21d9c60"
down_revision: Union[str, Sequence[str], None] = "7ab3c5e91f20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "custom_field_definitions",
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("field_type", sa.String(length=32), nullable=False, server_default="text"),
        sa.Column("group_name", sa.String(length=80), nullable=False, server_default="Custom"),
        sa.Column("options", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("default_value", sa.JSON(), nullable=True),
        sa.Column("sort_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_purged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.String(length=64), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["production_id"],
            ["productions.id"],
            name="fk_custom_field_definitions_production_id_productions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_custom_field_definitions"),
        sa.UniqueConstraint(
            "production_id",
            "key",
            name="uq_custom_field_definitions_production_key",
        ),
    )
    op.create_index(
        "ix_custom_field_definitions_production_id",
        "custom_field_definitions",
        ["production_id"],
        unique=False,
    )
    op.create_index(
        "ix_custom_field_definitions_field_type",
        "custom_field_definitions",
        ["field_type"],
        unique=False,
    )
    op.create_index(
        "ix_custom_field_definitions_sort_index",
        "custom_field_definitions",
        ["sort_index"],
        unique=False,
    )
    op.create_index(
        "ix_custom_field_definitions_is_active",
        "custom_field_definitions",
        ["is_active"],
        unique=False,
    )
    op.create_index(
        "ix_custom_field_definitions_is_purged",
        "custom_field_definitions",
        ["is_purged"],
        unique=False,
    )

    op.create_table(
        "shot_custom_field_values",
        sa.Column("shot_id", sa.String(), nullable=False),
        sa.Column("field_definition_id", sa.String(), nullable=False),
        sa.Column("value", sa.JSON(), nullable=True),
        sa.Column("updated_by", sa.String(length=64), nullable=True),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["shot_id"],
            ["shots.id"],
            name="fk_shot_custom_field_values_shot_id_shots",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["field_definition_id"],
            ["custom_field_definitions.id"],
            name=op.f("fk_shot_custom_field_values_field_definition_id_custom_field_definitions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_shot_custom_field_values"),
        sa.UniqueConstraint(
            "shot_id",
            "field_definition_id",
            name="uq_shot_custom_field_values_shot_field",
        ),
    )
    op.create_index(
        "ix_shot_custom_field_values_shot_id",
        "shot_custom_field_values",
        ["shot_id"],
        unique=False,
    )
    op.create_index(
        "ix_shot_custom_field_values_field_definition_id",
        "shot_custom_field_values",
        ["field_definition_id"],
        unique=False,
    )

    op.create_table(
        "column_preferences",
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("column_key", sa.String(length=120), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False, server_default="visible"),
        sa.Column("permanently_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("width_px", sa.Integer(), nullable=True),
        sa.Column("wrap_text", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_by", sa.String(length=64), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["production_id"],
            ["productions.id"],
            name="fk_column_preferences_production_id_productions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_column_preferences"),
        sa.UniqueConstraint(
            "production_id",
            "column_key",
            name="uq_column_preferences_production_key",
        ),
    )
    op.create_index(
        "ix_column_preferences_production_id",
        "column_preferences",
        ["production_id"],
        unique=False,
    )
    op.create_index(
        "ix_column_preferences_state",
        "column_preferences",
        ["state"],
        unique=False,
    )
    op.create_index(
        "ix_column_preferences_permanently_deleted",
        "column_preferences",
        ["permanently_deleted"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_column_preferences_permanently_deleted", table_name="column_preferences")
    op.drop_index("ix_column_preferences_state", table_name="column_preferences")
    op.drop_index("ix_column_preferences_production_id", table_name="column_preferences")
    op.drop_table("column_preferences")

    op.drop_index("ix_shot_custom_field_values_field_definition_id", table_name="shot_custom_field_values")
    op.drop_index("ix_shot_custom_field_values_shot_id", table_name="shot_custom_field_values")
    op.drop_table("shot_custom_field_values")

    op.drop_index("ix_custom_field_definitions_is_purged", table_name="custom_field_definitions")
    op.drop_index("ix_custom_field_definitions_is_active", table_name="custom_field_definitions")
    op.drop_index("ix_custom_field_definitions_sort_index", table_name="custom_field_definitions")
    op.drop_index("ix_custom_field_definitions_field_type", table_name="custom_field_definitions")
    op.drop_index("ix_custom_field_definitions_production_id", table_name="custom_field_definitions")
    op.drop_table("custom_field_definitions")
