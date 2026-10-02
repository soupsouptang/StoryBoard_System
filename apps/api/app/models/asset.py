"""Asset, AssetVersion, ShotAssetLink, StockAssetMetadata and ClientAssetRequest Models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (CheckConstraint("revision > 0", name="revision"),)
    revision: Mapped[int] = mapped_column(BigInteger, default=1, server_default="1")
    category: Mapped[str] = mapped_column(String(64), default="", server_default="")

    production_id: Mapped[str] = mapped_column(ForeignKey("productions.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255), default="")
    asset_type: Mapped[str] = mapped_column(String(64), default="storyboard", index=True)
    source_type: Mapped[str] = mapped_column(String(64), default="internal", index=True)
    storage_key: Mapped[str] = mapped_column(String(512), unique=True)
    proxy_storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(128), default="image/webp")

    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_frames: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    fps_num: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fps_den: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    file_size: Mapped[int] = mapped_column(BigInteger, default=0)
    hash_sha256: Mapped[str] = mapped_column(String(64), default="")
    rights_status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    versions: Mapped[list["AssetVersion"]] = relationship(back_populates="asset", cascade="all, delete-orphan")


class AssetVersion(Base):
    __tablename__ = "asset_versions"
    __table_args__ = (
        UniqueConstraint("asset_id", "version_number", name="uq_asset_versions_number"),
        CheckConstraint("version_number > 0", name="version_number"),
    )

    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    storage_key: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(128))
    file_size: Mapped[int] = mapped_column(BigInteger, default=0)
    hash_sha256: Mapped[str] = mapped_column(String(64), default="")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    asset: Mapped[Asset] = relationship(back_populates="versions")


class ShotAssetLink(Base):
    __tablename__ = "shot_asset_links"

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(64), default="reference")


class StockAssetMetadata(Base):
    __tablename__ = "stock_asset_metadata"

    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(128), default="getty")
    provider_asset_id: Mapped[str] = mapped_column(String(255), default="")
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    price: Mapped[Optional[float]] = mapped_column(nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(16), default="CNY")
    license_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    territory: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    platforms: Mapped[list] = mapped_column(JSON, default=list)
    purchase_status: Mapped[str] = mapped_column(String(64), default="searching")
    contract_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class ClientAssetRequest(Base):
    __tablename__ = "client_asset_requests"

    shot_id: Mapped[str] = mapped_column(ForeignKey("shots.id", ondelete="CASCADE"), index=True)
    requested_from: Mapped[str] = mapped_column(String(255), default="")
    requested_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    received_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="requested")
    notes: Mapped[str] = mapped_column(Text, default="")
