"""merge panel-frame and custom-field migration branches

Revision ID: d72a81e5c409
Revises: b4c18d2e7f90, b4e7a21d9c60
"""
from typing import Sequence, Union


revision: str = "d72a81e5c409"
down_revision: Union[str, Sequence[str], None] = (
    "b4c18d2e7f90",
    "b4e7a21d9c60",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
