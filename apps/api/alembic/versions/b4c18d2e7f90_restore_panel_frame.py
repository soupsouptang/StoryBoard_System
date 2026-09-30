"""restore the shot panel-frame text field

Revision ID: b4c18d2e7f90
Revises: 7ab3c5e91f20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4c18d2e7f90"
down_revision: Union[str, Sequence[str], None] = "7ab3c5e91f20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shots", sa.Column("panel_frame", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("shots", "panel_frame")
