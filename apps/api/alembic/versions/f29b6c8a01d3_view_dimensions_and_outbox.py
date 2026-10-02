"""Shared view dimensions, durable notifications and builtin column lifecycle.

Revision ID: f29b6c8a01d3
Revises: e18c4a7d92b0
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "f29b6c8a01d3"
down_revision = "e18c4a7d92b0"
branch_labels = None
depends_on = None

# Frozen mapping; migration history must not import mutable application catalogues.
BINDINGS = {
    "display_number": ("镜号", "entity", "shot.display_number", "text"),
    "tc_in": ("时码 TC", "derived", "timecode.tc_in", "timecode"),
    "panel_image": ("分镜画面", "derived", "panel.assets", "media"),
    "name": ("镜头标题", "entity", "shot.name", "text"),
    "description": ("画面描述", "entity", "shot.description", "textarea"),
    "voice_over": ("对应旁白", "entity", "shot.voice_over", "textarea"),
    "performance": ("表演提示", "entity", "shot.performance", "textarea"),
    "dialogue": ("对白", "entity", "shot.dialogue", "textarea"),
    "action": ("动作", "entity", "shot.action", "textarea"),
    "duration_frames": ("时长", "entity", "shot.duration_frames", "number"),
    "lens_mm": ("焦段", "entity", "shot.lens_mm", "number"),
    "sequence_id": ("篇章", "entity", "shot.sequence_id", "select"),
    "owner_id": ("负责人", "entity", "shot.owner_id", "text"),
    "primary_method": ("制作方式", "entity", "shot.production_methods", "multiselect"),
    "status": ("状态", "entity", "shot.status", "select"),
    "department": ("责任部门", "entity", "shot.department", "select"),
    "shot_size": ("景别", "entity", "shot.shot_size", "select"),
    "camera_angle": ("机位角度", "entity", "shot.camera_angle", "select"),
    "camera_movement": ("运镜", "entity", "shot.camera_movement", "json"),
    **{key: (label, "pending", None, "text") for key, label in (
        ("shot_reference", "镜头"), ("location", "场景/地点"), ("int_ext", "内外景"),
        ("day_night", "日夜"), ("dialogue_character", "对白角色"), ("edit_transition", "剪辑/转场"),
        ("notes", "备注"), ("feasibility", "可行性"), ("replacement", "建议替换内容"), ("execution_method", "执行方式"),
    )},
}


def upgrade() -> None:
    pg = op.get_context().dialect.name == "postgresql"
    json_type = sa.JSON().with_variant(JSONB(), "postgresql")
    with op.batch_alter_table("saved_views") as batch:
        batch.create_unique_constraint("uq_saved_views_production_id", ["production_id", "id"])
        batch.alter_column("revision", existing_type=sa.Integer(), type_=sa.BigInteger())
        if pg:
            batch.alter_column("config", existing_type=sa.JSON(), type_=JSONB(), postgresql_using="config::jsonb")
        batch.add_column(sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("row_height_mode", sa.String(16), nullable=False, server_default="auto"))
        batch.add_column(sa.Column("manual_row_height_px", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("measurement_generation", sa.BigInteger(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("measurement_context", json_type, nullable=False, server_default="{}"))
        for name, condition in (
            ("versions", "revision > 0 AND schema_version > 0 AND measurement_generation >= 0"),
            ("row_height_mode", "row_height_mode IN ('manual','auto')"),
            ("row_height_positive", "manual_row_height_px IS NULL OR manual_row_height_px > 0"),
            ("manual_row_height", "row_height_mode <> 'manual' OR manual_row_height_px IS NOT NULL"),
        ):
            batch.create_check_constraint(op.f("ck_saved_views_" + name), condition)
    op.create_table("view_row_layouts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("saved_view_id", sa.String(), nullable=False),
        sa.Column("shot_id", sa.String(), nullable=False),
        sa.Column("height_mode", sa.String(16), nullable=False),
        sa.Column("manual_height_px", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("saved_view_id", "shot_id", name="uq_view_row_layouts_view_shot"),
        sa.ForeignKeyConstraint(["production_id", "saved_view_id"], ["saved_views.production_id", "saved_views.id"], ondelete="CASCADE", name="fk_view_row_layouts_project_view"),
        sa.ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], ondelete="RESTRICT", name="fk_view_row_layouts_project_shot"),
        sa.CheckConstraint("height_mode IN ('manual','auto')", name=op.f("ck_view_row_layouts_height_mode")),
        sa.CheckConstraint("manual_height_px IS NULL OR manual_height_px > 0", name=op.f("ck_view_row_layouts_height_positive")),
        sa.CheckConstraint("height_mode <> 'manual' OR manual_height_px IS NOT NULL", name=op.f("ck_view_row_layouts_manual_height")),
    )
    for key in ("production_id", "saved_view_id", "shot_id"):
        op.create_index("ix_view_row_layouts_" + key, "view_row_layouts", [key])
    op.create_table("outbox_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("command_id", sa.String(80), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("entity_ids", json_type, nullable=False),
        sa.Column("revision", sa.BigInteger(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("production_id", "command_id", "event_type", name="uq_outbox_events_project_command_type"),
        sa.ForeignKeyConstraint(["production_id"], ["productions.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("revision > 0 AND attempt >= 0", name=op.f("ck_outbox_events_versions")),
    )
    op.create_index("ix_outbox_events_production_id", "outbox_events", ["production_id"])
    op.create_index("ix_outbox_events_pending", "outbox_events", ["published_at", "created_at"])
    for key, (label, kind, binding, field_type) in BINDINGS.items():
        op.execute(sa.text("""INSERT INTO project_columns
            (id, production_id, key, label, description, field_type, group_name, options,
             required, default_value, sort_index, origin, binding_kind, binding_key,
             schema_version, state, revision, deleted_at, purged_at, created_by, created_at, updated_at)
            SELECT id, production_id, 'builtin:' || column_key,
             CASE WHEN permanently_deleted THEN '' ELSE :label END, '', :field_type,
             CASE WHEN permanently_deleted THEN '' ELSE 'Builtin' END, '[]', false, NULL,
             position, 'builtin', :kind, :binding, 1,
             CASE WHEN permanently_deleted THEN 'purged' WHEN state = 'removed' THEN 'trashed' ELSE 'active' END,
             revision, CASE WHEN state = 'removed' OR permanently_deleted THEN updated_at ELSE NULL END,
             CASE WHEN permanently_deleted THEN updated_at ELSE NULL END,
             updated_by, created_at, updated_at FROM column_preferences WHERE column_key = :key
        """).bindparams(label=label, field_type=field_type, kind=kind, binding=binding, key=key))
        op.execute(sa.text("""UPDATE column_preferences SET state = 'hidden', permanently_deleted = false
            WHERE column_key = :key AND (state = 'removed' OR permanently_deleted)""").bindparams(key=key))


def downgrade() -> None:
    if op.get_context().as_sql:
        raise RuntimeError("Downgrade requires online scope validation")
    conn = op.get_bind()
    if (conn.execute(sa.text("SELECT 1 FROM view_row_layouts LIMIT 1")).first()
        or conn.execute(sa.text("SELECT 1 FROM outbox_events LIMIT 1")).first()
        or conn.execute(sa.text("SELECT 1 FROM project_columns WHERE origin = 'builtin' LIMIT 1")).first()
        or conn.execute(sa.text("SELECT 1 FROM saved_views WHERE row_height_mode <> 'auto' OR manual_row_height_px IS NOT NULL OR measurement_generation <> 0 LIMIT 1")).first()):
        raise RuntimeError("New view/lifecycle data exists; downgrade would discard authoritative writes")
    op.drop_table("view_row_layouts")
    op.drop_table("outbox_events")
    with op.batch_alter_table("saved_views") as batch:
        for name in ("versions", "row_height_mode", "row_height_positive", "manual_row_height"):
            batch.drop_constraint(op.f("ck_saved_views_" + name), type_="check")
        batch.drop_constraint("uq_saved_views_production_id", type_="unique")
        for name in ("schema_version", "row_height_mode", "manual_row_height_px", "measurement_generation", "measurement_context"):
            batch.drop_column(name)
        batch.alter_column("revision", existing_type=sa.BigInteger(), type_=sa.Integer())
        if op.get_context().dialect.name == "postgresql":
            batch.alter_column("config", existing_type=JSONB(), type_=sa.JSON(), postgresql_using="config::json")
