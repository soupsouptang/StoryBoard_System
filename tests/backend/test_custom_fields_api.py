"""Integration coverage for custom-field archive/purge tombstone semantics."""
from pathlib import Path
import sys

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.services.seed import seed_database


@pytest.fixture(autouse=True)
async def setup_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await session.commit()
    yield


@pytest.mark.asyncio
async def test_column_copy_full_data_metadata_conflict_protection_and_atomic_insert():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={"email": settings.INITIAL_ADMIN_EMAIL, "password": settings.INITIAL_ADMIN_PASSWORD})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        production = (await client.post("/api/v1/productions", headers=headers, json={"name": "Column commands synthetic", "fps_num": 24})).json()
        root = f"/api/v1/productions/{production['id']}"
        shots = []
        for index in range(2):
            response = await client.post(root + "/shots", headers=headers, json={"display_number": f"{index + 1:03d}", "description": "长描述" * (index + 1), "primary_method": "live", "secondary_methods": ["ae"], "lens_mm": 25 if index == 0 else None, "camera_movement": {"type": "推镜", "speed": "缓慢", "distance": index + 1}})
            assert response.status_code == 201, response.text
            shots.append(response.json())
        source = (await client.post(root + "/custom-fields", headers=headers, json={"label": "分组", "field_type": "select", "options": ["甲", "乙", "未使用"], "required": True, "default_value": "甲"})).json()
        write = await client.patch(f"/api/v1/shots/{shots[1]['id']}/custom-fields/{source['id']}", headers=headers, json={"revision": shots[1]["revision"], "value": "乙"})
        assert write.status_code == 200
        shots[1]["revision"] = write.json()["revision"]
        request = {"source": source["column_key"], "label": "分组", "field_revision": source["revision"],
            "shot_revisions": {shot["id"]: shot["revision"] for shot in shots}, "width_px": 247, "wrap_text": True}
        response = await client.post(root + "/custom-fields/copy-column", headers=headers, json=request)
        assert response.status_code == 201, response.text
        result = response.json()
        copied = result["field"]
        assert (copied["label"], copied["field_type"], copied["options"], copied["required"], copied["default_value"], copied["width_px"], copied["wrap_text"]) == ("分组01", "select", source["options"], True, "甲", 247, True)
        matrix = (await client.get(root + "/custom-field-values", headers=headers)).json()["values"]
        assert [matrix[shot["id"]][copied["id"]] for shot in shots] == ["甲", "乙"]
        before = (await client.get(root + "/custom-fields", headers=headers)).json()
        stale = await client.post(root + "/custom-fields/copy-column", headers=headers, json=request)
        assert stale.status_code == 409
        assert (await client.get(root + "/custom-fields", headers=headers)).json() == before
        request["shot_revisions"] = result["shot_revisions"]
        repeated = await client.post(root + "/custom-fields/copy-column", headers=headers, json=request)
        assert repeated.status_code == 201
        assert repeated.json()["field"]["label"] == "分组02"
        request.update(source="primary_method", label="制作方式", shot_revisions=repeated.json()["shot_revisions"], options=["live", "ae", "mg"])
        methods = await client.post(root + "/custom-fields/copy-column", headers=headers, json=request)
        assert methods.status_code == 201, methods.text
        assert methods.json()["field"]["field_type"] == "multiselect"
        assert methods.json()["field"]["options"] == ["live", "ae", "mg"]
        matrix = (await client.get(root + "/custom-field-values", headers=headers)).json()["values"]
        assert matrix[shots[0]["id"]][methods.json()["field"]["id"]] == ["live", "ae"]
        request.update(source="camera_movement", label="运镜", shot_revisions=methods.json()["shot_revisions"], options=[])
        movement = await client.post(root + "/custom-fields/copy-column", headers=headers, json=request)
        assert movement.status_code == 201, movement.text
        assert movement.json()["field"]["field_type"] == "json"
        matrix = (await client.get(root + "/custom-field-values", headers=headers)).json()["values"]
        assert [matrix[shot["id"]][movement.json()["field"]["id"]] for shot in shots] == [shot["camera_movement"] for shot in shots]
        request["shot_revisions"] = movement.json()["shot_revisions"]
        numeric = await client.post(root + "/custom-fields/copy-column", headers=headers, json={**request, "source": "lens_mm", "label": "焦段"})
        assert numeric.status_code == 201, numeric.text
        matrix = (await client.get(root + "/custom-field-values", headers=headers)).json()["values"]
        assert [matrix[shot["id"]][numeric.json()["field"]["id"]] for shot in shots] == [25, None]
        request["shot_revisions"] = numeric.json()["shot_revisions"]
        for key in ("display_number", "tc_in", "panel_image", "original_number", "original_description", "panel_frame", "movement_reference", "revision"):
            blocked = await client.post(root + "/custom-fields/copy-column", headers=headers, json={**request, "source": key})
            assert blocked.status_code == 400, (key, blocked.text)
        before = (await client.get(root + "/custom-fields", headers=headers)).json()
        failed = await client.post(root + "/custom-fields/insert", headers=headers, json={"fields": [{"label": "不应留下"}, {"label": " "}]})
        assert failed.status_code == 400
        assert (await client.get(root + "/custom-fields", headers=headers)).json() == before
        failed = await client.post(root + "/custom-fields/insert", headers=headers, json={"fields": [{"label": "镜号"}]})
        assert failed.status_code == 400
        # A protected source cannot be bypassed by renaming the display label.
        from app.services.custom_field_service import CustomFieldService
        from app.schemas.custom_field import ColumnCopyRequest
        from app.core.exceptions import DomainError
        from types import SimpleNamespace
        assert CustomFieldService._unique_label("标题2026", {"标题"}, numbered=True) == "标题202601"
        async with AsyncSessionLocal() as session:
            with pytest.raises(DomainError) as denied:
                await CustomFieldService.copy_column(session, production["id"], ColumnCopyRequest(**request), SimpleNamespace(role=SimpleNamespace(permissions={})))
            assert denied.value.code == "FORBIDDEN"
        imported = await client.post(root + "/custom-fields", headers=headers, json={"label": "原描述", "group_name": "导入原文"})
        assert imported.status_code == 201
        assert imported.json()["state"] == "hidden"


@pytest.mark.asyncio
async def test_column_delete_restore_revision_and_preserved_values():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={"email": settings.INITIAL_ADMIN_EMAIL, "password": settings.INITIAL_ADMIN_PASSWORD})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        production = (await client.post("/api/v1/productions", headers=headers, json={"name": "Delete restore synthetic"})).json()
        root = f"/api/v1/productions/{production['id']}"
        shot = (await client.post(root + "/shots", headers=headers, json={"display_number":"001", "name":"完整保留", "description":"原文"})).json()
        for key in ('display_number', 'tc_in', 'panel_image'):
            protected = await client.patch(root + f"/column-preferences/{key}/state", headers=headers, json={"state":"removed", "revision":0})
            assert protected.status_code == 400
            assert '不允许删除' in protected.text
        for key in ('name',):
            path = root + f"/column-preferences/{key}/state"
            deleted = await client.patch(path, headers=headers, json={"state":"removed", "revision":0})
            assert deleted.status_code == 200, deleted.text
            assert deleted.json()['state'] == 'removed'
            stale = await client.patch(path, headers=headers, json={"state":"visible", "revision":0})
            assert stale.status_code == 409
        invalid = await client.patch(root + "/column-preferences/revision/state", headers=headers, json={"state":"removed", "revision":0})
        assert invalid.status_code == 400
        current = (await client.get(root + "/shots", headers=headers)).json()[0]
        assert {key:value for key,value in current.items() if key not in {'created_at','updated_at'}} == {key:value for key,value in shot.items() if key not in {'created_at','updated_at'}}
        assert current['updated_at'].rstrip('Z') == shot['updated_at'].rstrip('Z')
        blocked = await client.post(root + "/custom-fields/copy-column", headers=headers, json={"source":"name", "label":"标题", "shot_revisions":{shot['id']:shot['revision']}})
        assert blocked.status_code == 400
        failed = await client.post(root + "/custom-fields/insert", headers=headers, json={"restore_columns":{"name":1}, "fields":[{"label":" "}]})
        assert failed.status_code == 400
        states = (await client.get(root + "/column-preferences", headers=headers)).json()
        assert next(row for row in states if row['column_key'] == 'name')['state'] == 'removed'
        bad_revision = await client.post(root + "/custom-fields/insert", headers=headers, json={"restore_columns":{"name":-1}})
        assert bad_revision.status_code == 422
        restored = await client.post(root + "/custom-fields/insert", headers=headers, json={"restore_columns":{"name":1}})
        assert restored.status_code == 201
        states = (await client.get(root + "/column-preferences", headers=headers)).json()
        assert all(row['state'] == 'visible' and row['revision'] == 2 for row in states)
        field = (await client.post(root + "/custom-fields", headers=headers, json={"label":"可恢复"})).json()
        value = await client.patch(f"/api/v1/shots/{shot['id']}/custom-fields/{field['id']}", headers=headers, json={"revision":shot['revision'], "value":"全列内容"})
        assert value.status_code == 200, value.text
        deleted = await client.patch(root + f"/custom-fields/{field['id']}/state", headers=headers, json={"revision":1,"state":"removed"})
        assert deleted.status_code == 200
        matrix = (await client.get(root + "/custom-field-values", headers=headers)).json()['values']
        assert matrix[shot['id']][field['id']] == '全列内容'
        restored = await client.patch(root + f"/custom-fields/{field['id']}/state", headers=headers, json={"revision":deleted.json()['revision'],"state":"visible"})
        assert restored.status_code == 200
        from app.services.custom_field_service import CustomFieldService
        from app.schemas.custom_field import BuiltinColumnStateUpdate
        from app.core.exceptions import DomainError
        from types import SimpleNamespace
        async with AsyncSessionLocal() as db:
            with pytest.raises(DomainError) as denied:
                await CustomFieldService.set_builtin_state(db, production['id'], 'name', BuiltinColumnStateUpdate(state='removed',revision=2), SimpleNamespace(role=SimpleNamespace(permissions={})))
            assert denied.value.code == 'FORBIDDEN'


@pytest.mark.asyncio
async def test_custom_field_archive_restore_purge_is_irreversible_and_scrubs_saved_views():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": settings.INITIAL_ADMIN_EMAIL,
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "Field Lifecycle Contract",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "16:9",
        })
        assert production.status_code == 201
        production_id = production.json()["id"]

        shot = await client.post(
            f"/api/v1/productions/{production_id}/shots",
            headers=headers,
            json={
                "display_number": "001",
                "name": "Custom field shot",
                "description": "Field lifecycle",
            },
        )
        assert shot.status_code == 201
        shot_id = shot.json()["id"]
        assert shot.json()["revision"] == 1

        created = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
            json={
                "key": "location_note",
                "label": "场地备注",
                "field_type": "text",
            },
        )
        assert created.status_code == 201
        field = created.json()
        assert field["key"] == "location_note"
        assert field["column_key"] == "custom:location_note"
        assert field["state"] == "visible"
        assert field["permanently_deleted"] is False
        assert field["revision"] == 1

        value_write = await client.patch(
            f"/api/v1/shots/{shot_id}/custom-fields/{field['id']}",
            headers=headers,
            json={"revision": 1, "value": "天津外景"},
        )
        assert value_write.status_code == 200
        assert value_write.json()["changed"] is True
        assert value_write.json()["revision"] == 2

        no_op = await client.patch(
            f"/api/v1/shots/{shot_id}/custom-fields/{field['id']}",
            headers=headers,
            json={"revision": 2, "value": "天津外景"},
        )
        assert no_op.status_code == 200
        assert no_op.json()["changed"] is False
        assert no_op.json()["revision"] == 2

        matrix = await client.get(
            f"/api/v1/productions/{production_id}/custom-field-values",
            headers=headers,
        )
        assert matrix.status_code == 200
        assert matrix.json()["values"][shot_id][field["id"]] == "天津外景"

        saved_view = await client.post(
            f"/api/v1/productions/{production_id}/saved-views",
            headers=headers,
            json={
                "name": "Custom column view",
                "view_type": "table",
                "is_shared": True,
                "config": {
                    "presentation": {
                        "columnOrder": [
                            "description",
                            "custom:location_note",
                            "status",
                        ],
                        "hiddenColumns": ["custom:location_note"],
                        "columnWidths": {
                            "description": 260,
                            "custom:location_note": 210,
                        },
                    },
                    "customColumns": {
                        "order": ["custom:location_note"],
                        "hidden": [],
                        "widths": {"custom:location_note": 210},
                    },
                    "sort": {
                        "key": "custom:location_note",
                        "direction": "desc",
                    },
                },
            },
        )
        assert saved_view.status_code == 201
        saved_view_id = saved_view.json()["id"]

        archived = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}/state",
            headers=headers,
            json={"revision": 1, "state": "removed"},
        )
        assert archived.status_code == 200
        archived_field = archived.json()
        assert archived_field["state"] == "removed"
        assert archived_field["revision"] == 2

        blocked_write = await client.patch(
            f"/api/v1/shots/{shot_id}/custom-fields/{field['id']}",
            headers=headers,
            json={"revision": 2, "value": "不应该写入"},
        )
        assert blocked_write.status_code == 400
        assert blocked_write.json()["error"]["code"] == "FIELD_ARCHIVED"

        restored = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}/state",
            headers=headers,
            json={"revision": 2, "state": "visible"},
        )
        assert restored.status_code == 200
        assert restored.json()["state"] == "visible"
        assert restored.json()["revision"] == 3

        archived_again = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}/state",
            headers=headers,
            json={"revision": 3, "state": "removed"},
        )
        assert archived_again.status_code == 200
        assert archived_again.json()["revision"] == 4

        stale_purge = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}/purge",
            headers=headers,
            json={"revision": 3},
        )
        assert stale_purge.status_code == 409
        assert stale_purge.json()["error"]["code"] == "CUSTOM_FIELD_REVISION_CONFLICT"

        purged = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}/purge",
            headers=headers,
            json={"revision": 4},
        )
        assert purged.status_code == 200
        assert purged.json() == {"ok": True, "purged": True}

        fields_after = await client.get(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
        )
        assert fields_after.status_code == 200
        assert fields_after.json() == []

        values_after = await client.get(
            f"/api/v1/productions/{production_id}/custom-field-values",
            headers=headers,
        )
        assert values_after.status_code == 200
        assert values_after.json() == {"values": {}}

        # Permanent tombstone: an old/new client cannot recreate the same key.
        recreate = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
            json={
                "key": "location_note",
                "label": "场地备注复活",
                "field_type": "text",
            },
        )
        assert recreate.status_code == 400
        assert recreate.json()["error"]["code"] == "FIELD_KEY_PURGED"

        # Purge also rewrites server Saved Views so stale layouts cannot revive
        # the deleted key even before the browser applies field-catalogue filtering.
        views_after = await client.get(
            f"/api/v1/productions/{production_id}/saved-views",
            headers=headers,
        )
        assert views_after.status_code == 200
        view = next(item for item in views_after.json() if item["id"] == saved_view_id)
        config = view["config"]
        assert "custom:location_note" not in config["presentation"]["columnOrder"]
        assert "custom:location_note" not in config["presentation"]["hiddenColumns"]
        assert "custom:location_note" not in config["presentation"]["columnWidths"]
        assert "custom:location_note" not in config["customColumns"]["order"]
        assert "custom:location_note" not in config["customColumns"]["widths"]
        assert config["sort"] == {"key": "default", "direction": "asc"}
        assert view["revision"] == 2



@pytest.mark.asyncio
async def test_custom_field_definition_update_is_revision_safe_and_preserves_used_select_options():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/api/v1/auth/login", json={
            "email": settings.INITIAL_ADMIN_EMAIL,
            "password": settings.INITIAL_ADMIN_PASSWORD,
        })
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        production = await client.post("/api/v1/productions", headers=headers, json={
            "name": "Field Definition Update Contract",
            "template_type": "film",
            "fps_num": 24,
            "aspect_ratio": "16:9",
        })
        assert production.status_code == 201
        production_id = production.json()["id"]

        shot = await client.post(
            f"/api/v1/productions/{production_id}/shots",
            headers=headers,
            json={
                "display_number": "001",
                "name": "Select field shot",
                "description": "Definition update",
            },
        )
        assert shot.status_code == 201
        shot_id = shot.json()["id"]
        assert shot.json()["revision"] == 1

        created = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
            json={
                "key": "location_status",
                "label": "场地状态",
                "description": "初始说明",
                "field_type": "select",
                "options": ["待定", "已确认"],
                "required": False,
            },
        )
        assert created.status_code == 201
        field = created.json()
        assert field["revision"] == 1
        assert field["options"] == ["待定", "已确认"]

        updated = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}",
            headers=headers,
            json={
                "revision": 1,
                "label": "场地确认状态",
                "description": "供制片与导演统一填写",
                "options": ["待定", "已确认", "驳回"],
                "required": True,
            },
        )
        assert updated.status_code == 200
        updated_field = updated.json()
        assert updated_field["revision"] == 2
        assert updated_field["label"] == "场地确认状态"
        assert updated_field["description"] == "供制片与导演统一填写"
        assert updated_field["options"] == ["待定", "已确认", "驳回"]
        assert updated_field["required"] is True
        assert updated_field["key"] == "location_status"
        assert updated_field["field_type"] == "select"

        stale_update = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}",
            headers=headers,
            json={"revision": 1, "label": "过期客户端修改"},
        )
        assert stale_update.status_code == 409
        assert stale_update.json()["error"]["code"] == "CUSTOM_FIELD_REVISION_CONFLICT"

        value_write = await client.patch(
            f"/api/v1/shots/{shot_id}/custom-fields/{field['id']}",
            headers=headers,
            json={"revision": 1, "value": "已确认"},
        )
        assert value_write.status_code == 200
        assert value_write.json()["revision"] == 2

        remove_used_option = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}",
            headers=headers,
            json={
                "revision": 2,
                "options": ["待定", "驳回"],
            },
        )
        assert remove_used_option.status_code == 400
        assert remove_used_option.json()["error"]["code"] == "FIELD_OPTION_IN_USE"

        rejected_snapshot = await client.get(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
        )
        assert rejected_snapshot.status_code == 200
        rejected_field = next(
            item for item in rejected_snapshot.json() if item["id"] == field["id"]
        )
        assert rejected_field["revision"] == 2
        assert rejected_field["options"] == ["待定", "已确认", "驳回"]

        # select -> text is safe because every persisted value is already a
        # string. The definition changes, but Shot data/revision is untouched.
        type_change = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{field['id']}",
            headers=headers,
            json={
                "revision": 2,
                "field_type": "text",
            },
        )
        assert type_change.status_code == 200
        assert type_change.json()["revision"] == 3
        assert type_change.json()["field_type"] == "text"
        assert type_change.json()["options"] == []

        numeric_text = await client.post(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
            json={
                "key": "numeric_text",
                "label": "数字文本",
                "field_type": "text",
            },
        )
        assert numeric_text.status_code == 201
        numeric_field = numeric_text.json()

        numeric_value = await client.patch(
            f"/api/v1/shots/{shot_id}/custom-fields/{numeric_field['id']}",
            headers=headers,
            json={"revision": 2, "value": "12"},
        )
        assert numeric_value.status_code == 200
        assert numeric_value.json()["revision"] == 3

        unsafe_type_change = await client.patch(
            f"/api/v1/productions/{production_id}/custom-fields/{numeric_field['id']}",
            headers=headers,
            json={
                "revision": 1,
                "field_type": "number",
            },
        )
        assert unsafe_type_change.status_code == 400
        assert (
            unsafe_type_change.json()["error"]["code"]
            == "FIELD_TYPE_VALUE_MIGRATION_REQUIRED"
        )

        fields_after = await client.get(
            f"/api/v1/productions/{production_id}/custom-fields",
            headers=headers,
        )
        assert fields_after.status_code == 200
        persisted = next(item for item in fields_after.json() if item["id"] == field["id"])
        assert persisted["revision"] == 3
        assert persisted["field_type"] == "text"
        assert persisted["options"] == []
        numeric_persisted = next(
            item for item in fields_after.json() if item["id"] == numeric_field["id"]
        )
        assert numeric_persisted["revision"] == 1
        assert numeric_persisted["field_type"] == "text"
