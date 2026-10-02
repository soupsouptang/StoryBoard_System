"""Native project commits and same-project branch ancestry.

Revision ID: b47e1c90d628
Revises: a36d9b21f807
"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision = "b47e1c90d628"
down_revision = "a36d9b21f807"
branch_labels = None
depends_on = None


def base_columns():
    return [
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    ]


def upgrade():
    op.create_table("project_commits",
        *base_columns(),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("branch_name", sa.String(64), nullable=False),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("merge_parent_id", sa.String(), nullable=True),
        sa.Column("snapshot", sa.JSON().with_variant(postgresql.JSONB(), "postgresql"), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("redaction_revision", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_by", sa.String(64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("production_id", "id", name="uq_project_commits_scope"),
        sa.ForeignKeyConstraint(["production_id"], ["productions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["production_id", "parent_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_commits_parent_scope"),
        sa.ForeignKeyConstraint(["production_id", "merge_parent_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_commits_merge_scope"),
        sa.CheckConstraint("schema_version > 0 AND redaction_revision >= 0", name=op.f("ck_project_commits_versions")),
        sa.CheckConstraint("parent_id IS NULL OR parent_id <> id", name=op.f("ck_project_commits_parent_not_self")),
        sa.CheckConstraint("merge_parent_id IS NULL OR merge_parent_id <> id", name=op.f("ck_project_commits_merge_not_self")),
    )
    op.create_index("ix_project_commits_production_id", "project_commits", ["production_id"])
    op.create_table("project_branches",
        *base_columns(),
        sa.Column("production_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("head_id", sa.String(), nullable=True),
        sa.Column("revision", sa.BigInteger(), nullable=False, server_default="1"),
        sa.Column("created_by", sa.String(64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("production_id", "name", name="uq_project_branches_name"),
        sa.ForeignKeyConstraint(["production_id"], ["productions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["production_id", "head_id"], ["project_commits.production_id", "project_commits.id"], ondelete="RESTRICT", name="fk_project_branches_head_scope"),
        sa.CheckConstraint("revision > 0", name=op.f("ck_project_branches_revision")),
    )
    op.create_index("ix_project_branches_production_id", "project_branches", ["production_id"])


def downgrade():
    if not op.get_context().as_sql:
        bind = op.get_bind()
        if bind.execute(sa.text("SELECT 1 FROM project_commits LIMIT 1")).first() or bind.execute(sa.text("SELECT 1 FROM project_branches LIMIT 1")).first():
            raise RuntimeError("Cannot discard project version history; export/recover it before downgrade")
    op.drop_table("project_branches")
    op.drop_table("project_commits")
