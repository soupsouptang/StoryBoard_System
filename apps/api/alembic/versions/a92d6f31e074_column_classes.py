"""Immutable column classes and builtin deletion protection.

Revision ID: a92d6f31e074
Revises: f81c5e20d963
"""
import sqlalchemy as sa
from alembic import op

revision = "a92d6f31e074"
down_revision = "f81c5e20d963"
branch_labels = depends_on = None

CORE = "'display_number','panel_image','tc_in','duration_frames','name','sequence_id','description','primary_method','status'"
CHECKS = {
    "column_class": "column_class IN ('builtin','preset','custom')",
    "class_origin": "(column_class = 'builtin' AND origin = 'builtin') OR (column_class = 'preset' AND origin = 'preset') OR (column_class = 'custom' AND origin IN ('custom','import'))",
    "builtin_lifecycle": "column_class <> 'builtin' OR state IN ('active','trashed')",
}


def upgrade():
    op.add_column("project_columns", sa.Column("column_class", sa.String(16), nullable=False, server_default="custom"))
    op.execute(f"UPDATE project_columns SET origin = 'preset' WHERE origin = 'builtin' AND substr(key,9) NOT IN ({CORE})")
    op.execute("UPDATE project_columns SET column_class = origin WHERE origin IN ('builtin','preset')")
    with op.batch_alter_table("project_columns") as batch:
        for name, condition in CHECKS.items():
            batch.create_check_constraint(op.f("ck_project_columns_" + name), condition)
    if op.get_bind().dialect.name == "postgresql":
        op.execute("""CREATE FUNCTION guard_column_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
            IF TG_OP = 'DELETE' THEN
                IF OLD.column_class = 'builtin' THEN RAISE EXCEPTION 'builtin column cannot be deleted'; END IF;
                RETURN OLD;
            END IF;
            IF NEW.column_class <> OLD.column_class OR NEW.origin <> OLD.origin OR
              (OLD.column_class = 'builtin' AND (NEW.key <> OLD.key OR NEW.field_type <> OLD.field_type OR
                NEW.binding_kind <> OLD.binding_kind OR NEW.binding_key IS DISTINCT FROM OLD.binding_key)) THEN
                RAISE EXCEPTION 'column class and builtin identity are immutable';
            END IF;
            RETURN NEW;
        END $$""")
        op.execute("CREATE TRIGGER guard_column_identity BEFORE UPDATE OR DELETE ON project_columns FOR EACH ROW EXECUTE FUNCTION guard_column_identity()")
    else:
        op.execute("""CREATE TRIGGER guard_column_identity BEFORE UPDATE ON project_columns
            WHEN NEW.column_class <> OLD.column_class OR NEW.origin <> OLD.origin OR
              (OLD.column_class = 'builtin' AND (NEW.key <> OLD.key OR NEW.field_type <> OLD.field_type OR
                NEW.binding_kind <> OLD.binding_kind OR NEW.binding_key IS NOT OLD.binding_key))
            BEGIN SELECT RAISE(ABORT, 'column class and builtin identity are immutable'); END""")
        op.execute("""CREATE TRIGGER guard_builtin_delete BEFORE DELETE ON project_columns
            WHEN OLD.column_class = 'builtin' BEGIN SELECT RAISE(ABORT, 'builtin column cannot be deleted'); END""")


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TRIGGER guard_column_identity ON project_columns")
        op.execute("DROP FUNCTION guard_column_identity()")
    else:
        op.execute("DROP TRIGGER guard_column_identity")
        op.execute("DROP TRIGGER guard_builtin_delete")
    with op.batch_alter_table("project_columns") as batch:
        for name in CHECKS:
            batch.drop_constraint(op.f("ck_project_columns_" + name), type_="check")
        batch.drop_column("column_class")
