"""Native comment activity, per-user watermarks and annotation colors.

Revision ID: a36d9b21f807
Revises: f29b6c8a01d3
"""
import sqlalchemy as sa
from alembic import op

revision = "a36d9b21f807"
down_revision = "f29b6c8a01d3"
branch_labels = None
depends_on = None

# Frozen migration constants, never import mutable runtime models/services.
PALETTE = ("#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669", "#0891B2", "#CA8A04", "#4F46E5")
COLOR_CHECK = "annotation_color IS NULL OR (length(annotation_color) = 7 AND substr(annotation_color,1,1) = '#' AND " + " AND ".join(
    f"substr(annotation_color,{position},1) IN ('0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F')" for position in range(2, 8)
) + ")"


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("annotation_color", sa.String(7), nullable=True))
        batch.add_column(sa.Column("revision", sa.BigInteger(), nullable=False, server_default="1"))
        batch.create_check_constraint(op.f("ck_users_annotation_color"), COLOR_CHECK)
        batch.create_check_constraint(op.f("ck_users_revision"), "revision > 0")
    # Same frozen UUID-suffix allocation online/offline on both dialects.
    suffix_cases = " ".join(f"WHEN '{digit}' THEN '{PALETTE[index % 8]}'" for index, digit in enumerate("0123456789abcdef"))
    length_cases = " ".join(f"WHEN {index} THEN '{color}'" for index, color in enumerate(PALETTE))
    op.execute(f"UPDATE users SET annotation_color=CASE lower(substr(id,length(id),1)) {suffix_cases} ELSE CASE (length(id) % 8) {length_cases} END END")
    with op.batch_alter_table("shots") as batch:
        batch.add_column(sa.Column("comment_event_seq", sa.BigInteger(), nullable=False, server_default="0"))
        batch.create_check_constraint(op.f("ck_shots_comment_event_seq"), "comment_event_seq >= 0")
    with op.batch_alter_table("comments") as batch:
        batch.add_column(sa.Column("revision", sa.BigInteger(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("event_seq", sa.BigInteger(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("last_activity_seq", sa.BigInteger(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("last_actor_id", sa.String(64), nullable=True))
        batch.create_unique_constraint("uq_comments_project_shot_id", ["production_id", "shot_id", "id"])
        batch.create_foreign_key("fk_comments_project_shot", "shots", ["production_id", "shot_id"], ["production_id", "id"], ondelete="RESTRICT")
        batch.create_foreign_key("fk_comments_parent_scope", "comments", ["production_id", "shot_id", "parent_id"], ["production_id", "shot_id", "id"], ondelete="RESTRICT")
        batch.create_check_constraint(op.f("ck_comments_event_versions"), "revision > 0 AND event_seq >= 0 AND last_activity_seq >= event_seq")
        batch.create_index("ix_comments_shot_activity", ["shot_id", "last_activity_seq"])
    op.create_table("comment_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("shot_id", sa.String(), nullable=False),
        sa.Column("comment_id", sa.String(), nullable=False),
        sa.Column("seq", sa.BigInteger(), nullable=False),
        sa.Column("event_type", sa.String(16), nullable=False),
        sa.Column("actor_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("shot_id", "seq", name="uq_comment_events_shot_seq"),
        sa.ForeignKeyConstraint(["production_id", "shot_id", "comment_id"], ["comments.production_id", "comments.shot_id", "comments.id"], name="fk_comment_events_scope", ondelete="RESTRICT"),
        sa.CheckConstraint("seq > 0", name=op.f("ck_comment_events_seq")),
        sa.CheckConstraint("event_type IN ('bootstrap','create','edit','resolve','reopen','delete')", name=op.f("ck_comment_events_event_type")),
    )
    op.create_index("ix_comment_events_shot_id", "comment_events", ["shot_id"])
    # VNext-only existing comments receive deterministic bootstrap activity.
    # Old edit authors cannot be inferred, so last_actor_id remains NULL.
    op.execute("""WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY shot_id ORDER BY created_at,id) AS seq FROM comments WHERE shot_id IS NOT NULL)
        UPDATE comments SET event_seq=(SELECT seq FROM ranked WHERE ranked.id=comments.id),
        last_activity_seq=(SELECT seq FROM ranked WHERE ranked.id=comments.id) WHERE shot_id IS NOT NULL""")
    op.execute("UPDATE shots SET comment_event_seq=COALESCE((SELECT MAX(last_activity_seq) FROM comments WHERE comments.shot_id=shots.id),0)")
    op.execute("""INSERT INTO comment_events (id,production_id,shot_id,comment_id,seq,event_type,actor_id,created_at,updated_at)
        SELECT 'bootstrap:' || id,production_id,shot_id,id,event_seq,'bootstrap',NULL,created_at,updated_at FROM comments WHERE shot_id IS NOT NULL""")
    op.create_table("comment_read_states",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("shot_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("last_read_seq", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "shot_id", name="uq_comment_read_states_user_shot"),
        sa.ForeignKeyConstraint(["production_id", "shot_id"], ["shots.production_id", "shots.id"], name="fk_comment_read_states_scope", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("last_read_seq >= 0", name=op.f("ck_comment_read_states_watermark")),
    )
    op.create_index("ix_comment_read_states_shot_id", "comment_read_states", ["shot_id"])
    op.create_index("ix_comment_read_states_user_id", "comment_read_states", ["user_id"])


def downgrade():
    if op.get_context().as_sql:
        raise RuntimeError("Online data checks required for comment activity downgrade")
    conn = op.get_bind()
    if conn.execute(sa.text("SELECT COUNT(*) FROM comment_read_states")).scalar() or conn.execute(sa.text("SELECT COUNT(*) FROM comment_events WHERE event_type <> 'bootstrap'")).scalar() or conn.execute(sa.text("SELECT COUNT(*) FROM users WHERE revision > 1")).scalar():
        raise RuntimeError("New comment activity/read/color writes cannot be discarded")
    op.drop_table("comment_read_states")
    op.drop_table("comment_events")
    with op.batch_alter_table("comments") as batch:
        batch.drop_index("ix_comments_shot_activity")
        batch.drop_constraint("fk_comments_parent_scope", type_="foreignkey")
        batch.drop_constraint("fk_comments_project_shot", type_="foreignkey")
        batch.drop_constraint("uq_comments_project_shot_id", type_="unique")
        batch.drop_constraint(op.f("ck_comments_event_versions"), type_="check")
        for column in ("last_actor_id", "last_activity_seq", "event_seq", "revision"):
            batch.drop_column(column)
    with op.batch_alter_table("shots") as batch:
        batch.drop_constraint(op.f("ck_shots_comment_event_seq"), type_="check")
        batch.drop_column("comment_event_seq")
    with op.batch_alter_table("users") as batch:
        batch.drop_constraint(op.f("ck_users_annotation_color"), type_="check")
        batch.drop_constraint(op.f("ck_users_revision"), type_="check")
        batch.drop_column("annotation_color")
        batch.drop_column("revision")
