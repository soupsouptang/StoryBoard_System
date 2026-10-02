"""Independent project export field templates with stable column identities."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = 'b03e7a42f185'
down_revision = 'a92d6f31e074'
branch_labels = depends_on = None


def upgrade():
    op.create_table('export_templates',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('production_id', sa.String(), sa.ForeignKey('productions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('name', sa.String(80), nullable=False),
        sa.Column('field_ids', sa.JSON().with_variant(JSONB(), 'postgresql'), nullable=False),
        sa.Column('schema_version', sa.Integer(), nullable=False),
        sa.Column('revision', sa.BigInteger(), nullable=False),
        sa.Column('created_by', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('production_id', 'name', name='uq_export_templates_project_name'),
        sa.CheckConstraint('revision > 0', name=op.f('ck_export_templates_revision')))
    op.create_index('ix_export_templates_production_id', 'export_templates', ['production_id'])


def downgrade():
    if op.get_context().as_sql or op.get_bind().execute(sa.text('SELECT 1 FROM export_templates LIMIT 1')).first():
        raise RuntimeError('Export templates cannot be discarded')
    op.drop_table('export_templates')
