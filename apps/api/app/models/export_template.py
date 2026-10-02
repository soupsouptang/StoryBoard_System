"""Project export selections, independent of table layouts and content history."""
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ExportTemplate(Base):
    __tablename__ = 'export_templates'
    __table_args__ = (UniqueConstraint('production_id', 'name', name='uq_export_templates_project_name'),
        CheckConstraint('revision > 0', name='revision'))
    production_id: Mapped[str] = mapped_column(ForeignKey('productions.id', ondelete='RESTRICT'), index=True)
    name: Mapped[str] = mapped_column(String(80))
    field_ids: Mapped[list] = mapped_column(JSON().with_variant(JSONB(), 'postgresql'))
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    revision: Mapped[int] = mapped_column(BigInteger, default=1)
    created_by: Mapped[str] = mapped_column(String)
