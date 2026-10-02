"""One-statement coherent capture of canonical project business data.

Explicit field lists prevent credentials, storage paths, private views, Presence,
personal read watermarks, and recursively nested version history entering commits.
Moodboards are deliberately excluded by product decision.
"""
from __future__ import annotations

import hashlib
import json
from sqlalchemy import JSON, String, cast, func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from app.models.asset import Asset, AssetVersion, ClientAssetRequest, ShotAssetLink
from app.models.field import ProjectColumn, ShotColumnValue
from app.models.media import MediaPresentation
from app.models.production import Production, Scene, Sequence
from app.models.shot import Panel, ProductionStep, Shot

# Closed schema: expand it together with the native component owner, never by
# serializing all ORM columns or accepting arbitrary client snapshot JSON.
FIELDS = {
    "production": (Production, "name code template_type fps_num fps_den drop_frame start_timecode_frames target_duration_frames aspect_ratio width height status"),
    "sequences": (Sequence, "display_number name description sort_index deleted_at"),
    "scenes": (Scene, "sequence_id display_number name int_ext day_night location description sort_index deleted_at"),
    "shots": (Shot, "sequence_id scene_id display_number sort_index name description panel_frame action performance composition director_notes duration_frames timing_locked shot_size camera_angle camera_height lens_mm camera sensor aperture shutter camera_movement dialogue voice_over subtitle music_notes sfx_notes primary_method secondary_methods department owner_id status approval_status vfx_required continuity_notes risk_notes deleted_at"),
    "panels": (Panel, "shot_id display_number sort_index asset_id duration_frames description deleted_at"),
    "steps": (ProductionStep, "shot_id type department owner_id status sort_index input_asset_id output_asset_id notes deleted_at"),
    "columns": (ProjectColumn, "key label description field_type group_name options required default_value sort_index origin column_class binding_kind binding_key schema_version state deleted_at"),
    "values": (ShotColumnValue, "shot_id column_id value"),
    "assets": (Asset, "filename display_name category asset_type source_type mime_type width height duration_frames fps_num fps_den file_size hash_sha256 rights_status deleted_at"),
    "asset_versions": (AssetVersion, "asset_id version_number mime_type file_size hash_sha256"),
    "asset_links": (ShotAssetLink, "shot_id asset_id role"),
    "asset_requests": (ClientAssetRequest, "shot_id requested_from requested_at received_at status notes"),
    "media_presentations": (MediaPresentation, "asset_id source_version_id owner_type owner_id revision transform"),
}


def content_hash(snapshot: dict) -> str:
    encoded = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


async def capture_project(db: AsyncSession, production_id: str) -> dict:
    # All sections are one UNION statement: PostgreSQL READ COMMITTED uses one
    # MVCC snapshot even when writers do not yet share a project revision owner.
    dialect = db.get_bind().dialect.name
    json_object = func.json_build_object if dialect == "postgresql" else func.json_object
    shot_ids = select(Shot.id).where(Shot.production_id == production_id)
    column_ids = select(ProjectColumn.id).where(ProjectColumn.production_id == production_id, ProjectColumn.state.not_in(("purged", "purging")))
    asset_ids = select(Asset.id).where(Asset.production_id == production_id)
    statements = []
    for section, (model, field_names) in FIELDS.items():
        fields = field_names.split()
        args = []
        for name in fields:
            column = getattr(model, name)
            # SQLite json_object treats JSON columns as strings unless tagged
            # with json(); PG keeps native JSON values, booleans and numbers.
            if dialect == "sqlite" and isinstance(column.type, JSON):
                column = func.json(column)
            args.extend((literal(name), column))
        if section == "asset_versions":
            framing_args = []
            for key in ("width", "height", "crop", "rotation", "aspect_ratio", "source_version_id"):
                value = model.metadata_json[key]
                framing_args.extend((literal(key), func.json(value) if dialect == "sqlite" else value))
            framing = json_object(*framing_args)
            args.extend((literal("framing"), func.json(framing) if dialect == "sqlite" else framing))
        if section == "assets":
            # Pin the selected immutable version in the manifest, so a later
            # crop cannot change which image a historical commit refers to.
            current_version = select(AssetVersion.id).where(AssetVersion.asset_id == model.id,
                AssetVersion.storage_key == model.storage_key).order_by(AssetVersion.version_number.desc()).limit(1)
            args.extend((literal("current_version_id"), current_version.correlate(model).scalar_subquery()))
        identity = model.owner_type + literal(":") + model.owner_id if model is MediaPresentation else model.id
        statement = select(literal(section).label("section"), identity.label("entity_id"),
            cast(json_object(*args), String).label("payload"))
        if model is Production:
            statement = statement.where(model.id == production_id, model.deleted_at.is_(None))
        elif model is ProjectColumn:
            statement = statement.where(model.id.in_(column_ids))
        elif model is ShotColumnValue:
            statement = statement.where(model.production_id == production_id, model.column_id.in_(column_ids))
        elif model is MediaPresentation:
            history = aliased(MediaPresentation)
            latest = select(func.max(history.revision)).where(history.production_id == model.production_id,
                history.owner_type == model.owner_type, history.owner_id == model.owner_id).correlate(model).scalar_subquery()
            statement = statement.where(model.production_id == production_id, model.revision == latest)
        elif model is AssetVersion:
            statement = statement.where(model.asset_id.in_(asset_ids))
        elif hasattr(model, "production_id"):
            statement = statement.where(model.production_id == production_id)
        else:
            statement = statement.where(model.shot_id.in_(shot_ids))
        statements.append(statement)
    snapshot = {"schema_version": 2, "sections": {name: {} for name in FIELDS}}
    for section, identity, encoded in (await db.execute(union_all(*statements))).all():
        payload = json.loads(encoded)
        if dialect == "sqlite":
            model, _ = FIELDS[section]
            for key, value in payload.items():
                if value is not None and hasattr(model, key) and getattr(model, key).type.python_type is bool:
                    payload[key] = bool(value)
        snapshot["sections"][section][identity] = payload
    return snapshot
