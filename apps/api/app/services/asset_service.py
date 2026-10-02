"""Read-only production-scoped asset queries."""
from __future__ import annotations

from sqlalchemy import func, or_, select, union
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainError, NotFoundError
from app.models.asset import Asset, ShotAssetLink
from app.models.production import Production
from app.models.shot import Panel, ProductionStep, Shot
from app.models.project_version import ProjectCommit


class AssetService:
    @staticmethod
    def permission(user, write=False):
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        allowed = ("production.write", "asset.write") if write else ("production.read", "production.write", "asset.write")
        if not permissions.get("*") and not any(permissions.get(key) for key in allowed):
            raise DomainError("当前账号没有素材操作权限", code="FORBIDDEN")

    @staticmethod
    async def asset(db, production_id, asset_id, *, lock=False, include_deleted=False):
        project = select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        if lock:
            project = project.with_for_update().execution_options(populate_existing=True)
        if (await db.execute(project)).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")
        query = select(Asset).where(Asset.production_id == production_id, Asset.id == asset_id)
        if not include_deleted:
            query = query.where(Asset.deleted_at.is_(None))
        if lock:
            query = query.with_for_update().execution_options(populate_existing=True)
        asset = (await db.execute(query)).scalar_one_or_none()
        if asset is None:
            raise NotFoundError("素材不存在")
        return asset

    @staticmethod
    async def references(db, production_id, asset_id):
        asset = await AssetService.asset(db, production_id, asset_id, include_deleted=True)
        matches = []
        for model, predicate, kind in (
            (Panel, Panel.asset_id == asset_id, "panel"),
            (ShotAssetLink, ShotAssetLink.asset_id == asset_id, "link"),
            (ProductionStep, or_(ProductionStep.input_asset_id == asset_id, ProductionStep.output_asset_id == asset_id), "step"),
        ):
            query = select(model, Shot).join(Shot, Shot.id == model.shot_id).where(
                Shot.production_id == production_id, predicate)
            for component, shot in (await db.execute(query)).all():
                deleted = shot.deleted_at is not None or getattr(component, "deleted_at", None) is not None
                matches.append({"component": kind, "component_id": component.id, "shot_id": shot.id,
                    "display_number": shot.display_number, "is_deleted": deleted})
        commits = (await db.execute(select(ProjectCommit.id, ProjectCommit.snapshot).where(
            ProjectCommit.production_id == production_id))).all()
        retained = [identity for identity, snapshot in commits if asset.id in snapshot.get("sections", {}).get("assets", {})]
        return {"asset_id": asset_id, "references": matches,
            "reference_shot_count": len({row["shot_id"] for row in matches if not row["is_deleted"]}),
            "retained_commit_ids": retained}

    @staticmethod
    async def list_production_assets(db: AsyncSession, production_id: str, *, search="", category=None, state="active") -> list[dict]:
        exists = await db.scalar(
            select(Production.id).where(
                Production.id == production_id,
                Production.deleted_at.is_(None),
            )
        )
        if exists is None:
            raise NotFoundError("项目不存在")

        linked_shots = union(
            select(ShotAssetLink.asset_id.label("asset_id"), Shot.id.label("shot_id"))
            .join(Shot, Shot.id == ShotAssetLink.shot_id)
            .where(
                Shot.production_id == production_id,
                Shot.deleted_at.is_(None),
            ),
            select(Panel.asset_id.label("asset_id"), Shot.id.label("shot_id"))
            .join(Shot, Shot.id == Panel.shot_id)
            .where(
                Panel.asset_id.is_not(None),
                Panel.deleted_at.is_(None),
                Shot.production_id == production_id,
                Shot.deleted_at.is_(None),
            ),
            *[select(column.label("asset_id"), Shot.id.label("shot_id"))
                .join(Shot, Shot.id == ProductionStep.shot_id).where(
                    column.is_not(None), ProductionStep.deleted_at.is_(None),
                    Shot.production_id == production_id, Shot.deleted_at.is_(None))
                for column in (ProductionStep.input_asset_id, ProductionStep.output_asset_id)],
        ).subquery()
        reference_counts = (
            select(
                linked_shots.c.asset_id,
                func.count(func.distinct(linked_shots.c.shot_id)).label("reference_shot_count"),
            )
            .group_by(linked_shots.c.asset_id)
            .subquery()
        )
        rows = await db.execute(
            select(
                Asset,
                func.coalesce(reference_counts.c.reference_shot_count, 0).label("reference_shot_count"),
            )
            .outerjoin(reference_counts, reference_counts.c.asset_id == Asset.id)
            .where(
                Asset.production_id == production_id,
                Asset.deleted_at.is_(None) if state == "active" else Asset.deleted_at.is_not(None),
                or_(Asset.display_name.contains(search, autoescape=True), Asset.filename.contains(search, autoescape=True)),
                Asset.category == category if category is not None else True,
            )
            .order_by(Asset.created_at.desc(), Asset.id)
        )
        return [
            {
                "id": asset.id,
                "production_id": asset.production_id,
                "filename": asset.filename,
                "display_name": asset.display_name,
                "asset_type": asset.asset_type,
                "source_type": asset.source_type,
                "mime_type": asset.mime_type,
                "width": asset.width,
                "height": asset.height,
                "file_size": asset.file_size,
                "hash_sha256": asset.hash_sha256,
                "rights_status": asset.rights_status,
                "created_at": asset.created_at,
                "reference_shot_count": reference_count,
                "revision": asset.revision,
                "category": asset.category,
                "has_thumbnail": bool(asset.proxy_storage_key),
                "updated_at": asset.updated_at,
                "deleted_at": asset.deleted_at,
            }
            for asset, reference_count in rows.all()
        ]
