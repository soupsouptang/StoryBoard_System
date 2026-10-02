"""Production aggregate revision foundation.

Revision ID: d6a93f08b241
Revises: c58f2d01e739
"""
import sqlalchemy as sa
from alembic import op

revision = "d6a93f08b241"
down_revision = "c58f2d01e739"
branch_labels = None
depends_on = None

FIELDS = ("revision", "schema_revision", "order_revision", "content_revision", "purge_epoch")


def upgrade():
    with op.batch_alter_table("productions") as batch:
        for field in FIELDS:
            epoch = field == "purge_epoch"
            batch.add_column(sa.Column(field, sa.BigInteger(), nullable=False, server_default="0" if epoch else "1"))
            batch.create_check_constraint(op.f(f"ck_productions_{field}"), f"{field} >= 0" if epoch else f"{field} > 0")


def downgrade():
    # Losing authoritative concurrency tokens would make old commands replayable.
    if op.get_context().as_sql:
        raise RuntimeError("Production revision downgrade requires an online history check")
    condition = " OR ".join(f"{field} <> {0 if field == 'purge_epoch' else 1}" for field in FIELDS)
    if op.get_bind().execute(sa.text(f"SELECT 1 FROM productions WHERE {condition} LIMIT 1")).first():
        raise RuntimeError("Cannot discard advanced Production revisions")
    with op.batch_alter_table("productions") as batch:
        for field in reversed(FIELDS):
            batch.drop_constraint(op.f(f"ck_productions_{field}"), type_="check")
            batch.drop_column(field)
