"""Real decoded image, immutable storage, crop and asset lifecycle contracts."""
from io import BytesIO
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import sys
import pytest
from PIL import Image
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from app.core.database import Base, AsyncSessionLocal, async_engine, get_db
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models import Asset, AssetVersion, Panel, Production, Role, Shot, User
from app.schemas.asset import AssetUpdate
from app.schemas.image_crop import ImageCropRequest
from app.services.asset_mutation_service import AssetMutationService as Assets
from app.services.asset_service import AssetService
from app.services.image_crop_service import ImageCropService as Crop
from app.services.image_storage import prepare_image
from app.services.panel_media_service import PanelMediaService
from app.services.project_snapshot import capture_project


def image_bytes(size=(200, 100), color="red"):
    stream = BytesIO()
    Image.new("RGB", size, color).save(stream, format="PNG")
    return stream.getvalue()


@pytest.fixture(autouse=True)
async def isolated_database():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


async def fixture(db):
    role = Role(name="image-admin", permissions={"*": True})
    user = User(id="u", email="image@example.com", password_hash="synthetic", role=role)
    db.add_all([user, Production(id="p", name="Synthetic"), Production(id="other", name="Other")])
    await db.flush()
    return user


def request(revision, source, **kwargs):
    return ImageCropRequest(revision=revision, source_version_id=source,
        crop=kwargs.pop("crop", {"x": 0, "y": 0, "width": 1, "height": 1}),
        aspect_ratio=kwargs.pop("aspect_ratio", "21:9"), output_width=210, **kwargs)


@pytest.mark.asyncio
async def test_upload_crop_original_retention_revisions_and_scope(tmp_path):
    data = image_bytes()
    async with AsyncSessionLocal() as db:
        user = await fixture(db)
        uploaded = await Assets.upload(db, "p", data, "../synthetic.png", user, tmp_path)
        asset = await db.get(Asset, uploaded["asset_id"])
        version = (await db.execute(select(AssetVersion).where(AssetVersion.asset_id == asset.id))).scalar_one()
        original = tmp_path / version.storage_key
        assert original.read_bytes() == data and asset.filename == "synthetic.png"
        assert asset.hash_sha256 == hashlib.sha256(data).hexdigest()
        assert Image.open(tmp_path / asset.proxy_storage_key).size == (384, 192)
        result = await Crop.crop(db, "p", asset.id, request(1, version.id), user, tmp_path)
        rendered = Image.open(tmp_path / asset.storage_key).convert("RGB")
        assert rendered.size == (210, 90)
        assert max(rendered.getpixel((0, 45))) < 10, "contain must letterbox without stretching"
        assert rendered.getpixel((105, 45))[0] > 240
        assert original.read_bytes() == data and result["revision"] == 2
        assert len(await Crop.versions(db, "p", asset.id, user)) == 2
        snapshot = await capture_project(db, "p")
        framing = snapshot["sections"]["asset_versions"][result["version_id"]]["framing"]
        assert snapshot["sections"]["assets"][asset.id]["current_version_id"] == result["version_id"]
        assert framing["crop"] == {"x": 0, "y": 0, "width": 1, "height": 1}
        assert framing["aspect_ratio"] == "21:9" and framing["source_version_id"] == version.id
        before_files = set(tmp_path.iterdir())
        with pytest.raises(ConflictError):
            await Crop.crop(db, "p", asset.id, request(1, version.id), user, tmp_path)
        with pytest.raises(NotFoundError):
            await Crop.source(db, "other", asset.id, version.id, user, tmp_path)
        with pytest.raises(DomainError, match="裁剪区域"):
            await Crop.crop(db, "p", asset.id, request(2, version.id,
                crop={"x": .8, "y": 0, "width": .3, "height": 1}), user, tmp_path)
        assert set(tmp_path.iterdir()) == before_files and asset.revision == 2
        noop = await Assets.update(db, "p", asset.id, AssetUpdate(revision=2, display_name=asset.display_name), user)
        assert not noop["changed"] and noop["revision"] == 2
        await Assets.update(db, "p", asset.id, AssetUpdate(revision=2, category="Reference", display_name="Reframed"), user)
        assert (await AssetService.list_production_assets(db, "p", search="Reframed", category="Reference"))[0]["revision"] == 3
        assert not await AssetService.list_production_assets(db, "p", search="%")
        await db.commit()


@pytest.mark.asyncio
async def test_rotated_crop_panel_upload_and_recoverable_delete(tmp_path):
    canvas = Image.new("RGB", (200, 100), "red")
    canvas.paste("blue", (100, 0, 200, 100))
    source = BytesIO()
    canvas.save(source, format="PNG")
    async with AsyncSessionLocal() as db:
        user = await fixture(db)
        uploaded = await Assets.upload(db, "p", source.getvalue(), "rotate.png", user, tmp_path)
        asset = await db.get(Asset, uploaded["asset_id"])
        version = (await Crop.versions(db, "p", asset.id, user))[0]
        await Crop.crop(db, "p", asset.id, request(1, version["id"], rotation=90, aspect_ratio="1:1",
            crop={"x": 0, "y": 0, "width": 1, "height": .5}), user, tmp_path)
        pixel = Image.open(tmp_path / asset.storage_key).convert("RGB").getpixel((105, 105))
        assert pixel[0] > 240 and pixel[2] < 10, "top half after clockwise rotation was left red half"
        shot = Shot(id="s", production_id="p", name="Synthetic")
        db.add(shot)
        await db.flush()
        db.add(Panel(shot_id="s", asset_id=asset.id))
        await db.flush()
        with pytest.raises(DomainError, match="仍被镜头"):
            await Assets.delete_or_restore(db, "p", asset.id, 2, user)
        shot.deleted_at = datetime.now(timezone.utc)
        await db.flush()
        assert (await Assets.delete_or_restore(db, "p", asset.id, 2, user))["deleted"]
        assert not await AssetService.list_production_assets(db, "p")
        assert (await AssetService.list_production_assets(db, "p", state="trashed"))[0]["id"] == asset.id
        assert not (await Assets.delete_or_restore(db, "p", asset.id, 3, user, restore=True))["deleted"]
        active = Shot(id="active", production_id="p", name="Panel")
        db.add(active)
        await db.flush()
        locked = await PanelMediaService.get_upload_shot(db, shot_id="active", revision=1)
        result = await PanelMediaService.save_panel_image(db, shot=locked, data=image_bytes(),
            filename="panel.png", user_id=user.id, media_root=tmp_path)
        panel_asset = await db.get(Asset, result["asset_id"])
        assert panel_asset.proxy_storage_key and len(await Crop.versions(db, "p", panel_asset.id, user)) == 1
        assert (await AssetService.references(db, "p", panel_asset.id))["reference_shot_count"] == 1


@pytest.mark.asyncio
async def test_invalid_decode_and_transaction_failure_remove_only_new_files(tmp_path):
    with pytest.raises(DomainError, match="无法读取"):
        prepare_image(b"\x89PNG\r\n\x1a\ninvalid")
    sentinel = tmp_path / "retained.png"
    sentinel.write_bytes(image_bytes())
    dependency = get_db()
    db = await anext(dependency)
    user = await fixture(db)
    await Assets.upload(db, "p", image_bytes(), "new.png", user, tmp_path)
    assert len(list(tmp_path.iterdir())) == 3
    with pytest.raises(RuntimeError, match="synthetic failure"):
        await dependency.athrow(RuntimeError("synthetic failure"))
    assert list(tmp_path.iterdir()) == [sentinel]
