"""Persistent, isolated 100-step command journals and personal table layouts."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
revision = 'a83f02c1d765'
down_revision = 'b03e7a42f185'
branch_labels = depends_on = None


def common():
    return [sa.Column('id', sa.String(), primary_key=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)]


def scope():
    return [sa.Column('production_id', sa.String(), sa.ForeignKey('productions.id', ondelete='RESTRICT'), nullable=False),
            sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)]


def upgrade():
    op.create_table('history_states', *common(), *scope(),
        sa.Column('revision', sa.BigInteger(), nullable=False), sa.Column('next_sequence', sa.BigInteger(), nullable=False),
        sa.UniqueConstraint('production_id', 'user_id', name='uq_history_states_scope'),
        sa.CheckConstraint('revision > 0 AND next_sequence > 0', name=op.f('ck_history_states_versions')))
    op.create_table('history_entries', *common(),
        sa.Column('state_id', sa.String(), sa.ForeignKey('history_states.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sequence', sa.BigInteger(), nullable=False), sa.Column('label', sa.String(80), nullable=False),
        sa.Column('permission', sa.String(80), nullable=False), sa.Column('applied', sa.Boolean(), nullable=False),
        sa.Column('changes', sa.JSON().with_variant(JSONB(), 'postgresql'), nullable=False),
        sa.UniqueConstraint('state_id', 'sequence', name='uq_history_entries_sequence'),
        sa.CheckConstraint('sequence > 0', name=op.f('ck_history_entries_sequence')))
    op.create_table('workspace_layouts', *common(), *scope(),
        sa.Column('revision', sa.BigInteger(), nullable=False),
        sa.Column('config', sa.JSON().with_variant(JSONB(), 'postgresql'), nullable=False),
        sa.UniqueConstraint('production_id', 'user_id', name='uq_workspace_layouts_scope'),
        sa.CheckConstraint('revision > 0', name=op.f('ck_workspace_layouts_revision')))
    for table, names in [('history_states', ['production_id', 'user_id']), ('history_entries', ['state_id']), ('workspace_layouts', ['production_id', 'user_id'])]:
        for name in names: op.create_index(f'ix_{table}_{name}', table, [name])


def downgrade():
    if op.get_context().as_sql or any(op.get_bind().execute(sa.text(f'SELECT 1 FROM {table} LIMIT 1')).first()
        for table in ('history_entries', 'workspace_layouts')):
        raise RuntimeError('Do not discard acknowledged command history or personal layouts')
    op.drop_table('workspace_layouts')
    op.drop_table('history_entries')
    op.drop_table('history_states')
