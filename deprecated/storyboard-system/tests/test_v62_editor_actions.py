import base64
import io
import importlib.util
import os
import tempfile
import threading
import unittest
import urllib.request
import urllib.parse
import json
import zipfile
import uuid
from pathlib import Path


class V62EditorActionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"
        spec = importlib.util.spec_from_file_location("frameforge_editor_actions", Path(__file__).resolve().parents[1] / "server.py")
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"
        import http.cookiejar
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        _, session = cls.request("/api/login", "POST", {"username": "qa-admin", "password": "FrameForge2026!QA"})
        cls.csrf = session["csrf"]
        _, bundle = cls.request("/api/projects", "POST", {"name": "Editor Actions QA", "target_seconds": 30}, cls.csrf)
        cls.pid = bundle["project"]["id"]

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown(); cls.httpd.server_close(); cls.temp.cleanup()

    @classmethod
    def request(cls, path, method="GET", data=None, csrf=None, content_type="application/json"):
        body = json.dumps(data, ensure_ascii=False).encode() if isinstance(data, (dict, list)) else data
        headers = {"Content-Type": content_type}
        if csrf: headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(cls.base + path, data=body, headers=headers, method=method)
        with cls.client.open(req) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None

    def test_reorder_survives_stale_field_save_and_conflicts(self):
        import urllib.error
        _, initial = self.request('/api/projects', 'POST', {'name': 'Reorder regression'}, self.csrf)
        pid = initial['project']['id']
        order = [s['id'] for s in initial['shots']]
        self.assertGreaterEqual(len(order), 3)
        # A field update between reading and dropping is not an order conflict.
        first = initial['shots'][0]
        self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [{**first, 'title': 'concurrent', 'changed_fields': ['title']}]}, self.csrf)
        desired = order[2:] + order[:2]
        _, moved = self.request(f'/api/projects/{pid}/shots/reorder', 'POST', {'shot_ids': desired, 'base_order': order}, self.csrf)
        self.assertEqual([s['id'] for s in moved['shots']], desired)
        # Old full-client array, but only description is edited: order and title survive.
        stale = [{**s, 'changed_fields': []} for s in initial['shots']]
        stale[0].update(description='late save', changed_fields=['description'])
        self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': stale}, self.csrf)
        _, saved = self.request(f'/api/projects/{pid}')
        self.assertEqual([s['id'] for s in saved['shots']], desired)
        self.assertEqual([s['number'] for s in saved['shots']], [f'{i+1:03d}' for i in range(len(order))])
        actual = next(s for s in saved['shots'] if s['id'] == first['id'])
        self.assertEqual((actual['title'], actual['description']), ('concurrent', 'late save'))
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request(f'/api/projects/{pid}/shots/reorder', 'POST', {'shot_ids': order, 'base_order': order}, self.csrf)
        self.assertEqual(error.exception.code, 409)
        # A mixed deleted/live selection remains idempotent.
        self.request(f'/api/projects/{pid}/shots/bulk-delete', 'POST', {'shot_ids': [order[0]]}, self.csrf)
        _, deleted = self.request(f'/api/projects/{pid}/shots/bulk-delete', 'POST', {'shot_ids': order[:2]}, self.csrf)
        self.assertFalse(set(order[:2]).intersection(s['id'] for s in deleted['shots']))

    def test_insert_delete_and_replace_all(self):
        _, before = self.request(f"/api/projects/{self.pid}")
        initial_count = len(before["shots"])
        status, bundle = self.request(f"/api/projects/{self.pid}/shots", "POST", {"position": 1, "title": "插入测试"}, self.csrf)
        self.assertEqual(status, 201)
        inserted = next(shot for shot in bundle["shots"] if shot["title"] == "插入测试")
        self.assertEqual(inserted["number"], "002")
        status, _ = self.request(f"/api/shots/{inserted['id']}", "DELETE", csrf=self.csrf)
        self.assertEqual(status, 204)
        _, after_delete = self.request(f"/api/projects/{self.pid}")
        self.assertEqual(len(after_delete["shots"]), initial_count)
        self.assertEqual([shot["number"] for shot in after_delete["shots"]], [f"{i:03d}" for i in range(1, initial_count + 1)])

        headers = ["镜号", "镜头标题", "画面描述", "旁白", "时长"]
        rows = [["R-001", "替换一", "画面一", "旁白一", "2"], ["R-002", "替换二", "画面二", "旁白二", "3"]]
        mapping = {"number": {"col": 0}, "title": {"col": 1}, "description": {"col": 2}, "voiceover": {"col": 3}, "duration": {"col": 4}}
        status, result = self.request(f"/api/projects/{self.pid}/import-commit", "POST", {"rows": rows, "headers": headers, "mapping": mapping, "mode": "replace"}, self.csrf)
        self.assertEqual(status, 200)
        self.assertTrue(result["replaced"])
        self.assertEqual(result["mode"], "replace")
        self.assertEqual(result["before_count"], initial_count)
        self.assertEqual(result["after_count"], 2)
        self.assertEqual([shot["title"] for shot in result["bundle"]["shots"]], ["替换一", "替换二"])

    def test_new_shot_persists_dialogue_for_row_duplicate(self):
        status, created = self.request(f"/api/projects/{self.pid}/shots", "POST", {
            "title": "复制对白契约",
            "voiceover": "旁白原文",
            "dialogue": "角色台词应随镜头副本保留。",
            "duration_frames": 81,
        }, self.csrf)
        self.assertEqual(status, 201)
        shot = next(item for item in created["shots"] if item["id"] == created["created_shot_id"])
        self.assertEqual(shot["dialogue"], "角色台词应随镜头副本保留。")
        self.assertEqual(shot["voiceover"], "旁白原文")
        _, reloaded = self.request(f"/api/projects/{self.pid}")
        persisted = next(item for item in reloaded["shots"] if item["id"] == shot["id"])
        self.assertEqual(persisted["dialogue"], shot["dialogue"])

    def test_custom_column_update_and_delete(self):
        import urllib.error
        status, field = self.request(f"/api/projects/{self.pid}/custom-fields", "POST", {"label": "导演备注", "key": "director_note", "field_type": "text"}, self.csrf)
        self.assertEqual(status, 201)
        try:
            status, rejected = self.request(f"/api/projects/{self.pid}/custom-fields/{field['id']}", "PUT", {"label": "导演重点", "key": "director_focus", "field_type": "textarea"}, self.csrf)
        except urllib.error.HTTPError as response:
            status, rejected = response.code, json.loads(response.read().decode("utf-8"))
        self.assertEqual(status, 409)
        self.assertIn("不可修改", rejected["error"])
        status, updated = self.request(f"/api/projects/{self.pid}/custom-fields/{field['id']}", "PUT", {"label": "导演重点", "field_type": "textarea"}, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual(updated["key"], "director_note")
        self.assertEqual(updated["label"], "导演重点")
        status, select_field = self.request(f"/api/projects/{self.pid}/custom-fields", "POST", {"label": "状态", "key": "approval_state", "field_type": "select", "options": ["待定", "已确认"]}, self.csrf)
        self.assertEqual(status, 201)
        _, fields = self.request(f"/api/projects/{self.pid}/custom-fields")
        self.assertEqual(next(item for item in fields if item["id"] == select_field["id"])["options"], ["待定", "已确认"])
        status, _ = self.request(f"/api/projects/{self.pid}/custom-fields/{field['id']}", "DELETE", csrf=self.csrf)
        self.assertEqual(status, 204)
        _, fields = self.request(f"/api/projects/{self.pid}/custom-fields")
        self.assertFalse(any(item["id"] == field["id"] for item in fields))

    def test_project_settings_are_editable(self):
        status, bundle = self.request(f"/api/projects/{self.pid}", "PUT", {
            "name": "Editor Settings QA", "production_type": "documentary",
            "fps": 24, "target_seconds": 42.5, "aspect_ratio": "2.39:1",
            "start_tc": "10:00:00:00"
        }, self.csrf)
        self.assertEqual(status, 200)
        project = bundle["project"]
        self.assertEqual(project["name"], "Editor Settings QA")
        self.assertEqual(project["production_type"], "documentary")
        self.assertEqual(project["fps"], 24)
        self.assertEqual(project["target_seconds"], 42.5)
        self.assertEqual(project["aspect_ratio"], "2.39:1")
        self.assertEqual(project["start_tc"], "10:00:00:00")
        self.assertTrue(project["updated_by"])

    def test_production_step_full_crud_persists_business_fields(self):
        _, bundle = self.request(f"/api/projects/{self.pid}")
        shot_id = bundle["shots"][0]["id"]
        status, step = self.request(f"/api/shots/{shot_id}/production-steps", "POST", {
            "name": "合成交付", "type": "COMPOSITE", "input_asset": "plate-v003",
            "output_asset": "master-v001", "department": "VFX", "owner": "Lin",
            "status": "进行中", "notes": "保留 alpha 通道"
        }, self.csrf)
        self.assertEqual(status, 201)
        self.assertEqual(step["type"], "COMPOSITE")
        self.assertEqual(step["input_asset"], "plate-v003")
        self.assertEqual(step["output_asset"], "master-v001")

        status, updated = self.request(f"/api/production-steps/{step['id']}", "PUT", {
            "output_asset": "master-v002", "sort_index": 0
        }, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual(updated["output_asset"], "master-v002")
        self.assertEqual(updated["sort_index"], 0)
        self.assertEqual(updated["step_order"], 0)

        _, reloaded = self.request(f"/api/projects/{self.pid}")
        persisted = next(item for item in reloaded["shots"][0]["steps"] if item["id"] == step["id"])
        self.assertEqual(persisted["input_asset"], "plate-v003")
        self.assertEqual(persisted["output_asset"], "master-v002")

        status, _ = self.request(f"/api/production-steps/{step['id']}", "DELETE", csrf=self.csrf)
        self.assertEqual(status, 204)
        _, reloaded = self.request(f"/api/projects/{self.pid}")
        self.assertFalse(any(item["id"] == step["id"] for item in reloaded["shots"][0]["steps"]))

    def test_project_delete_removes_database_rows_and_owned_files(self):
        _, bundle = self.request("/api/projects", "POST", {"name": "Delete Files QA", "target_seconds": 10}, self.csrf)
        project_id = bundle["project"]["id"]
        shot_id = bundle["shots"][0]["id"]
        png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
        query = urllib.parse.urlencode({"shot_id": shot_id, "filename": "delete-me.png"})
        status, asset = self.request(f"/api/projects/{project_id}/media?{query}", "POST", png, self.csrf, "image/png")
        self.assertEqual(status, 201)
        with self.app.connect() as db:
            stored_name = db.execute("SELECT stored_name FROM assets WHERE id=?", (asset["id"],)).fetchone()["stored_name"]
        media_path = self.app.MEDIA_ROOT / stored_name
        self.assertTrue(media_path.is_file())

        preview_id = "deletepreview123456789012345"
        staged_name = f"{preview_id}.xlsx"
        staged_path = self.app.IMPORT_ROOT / staged_name
        manifest_path = self.app.IMPORT_ROOT / f"{preview_id}.json"
        staged_path.write_bytes(b"staged")
        manifest_path.write_text(json.dumps({"project_id": project_id, "stored_name": staged_name}), encoding="utf-8")
        export_dir = self.app.EXPORT_ROOT / project_id
        export_dir.mkdir()
        (export_dir / "cached.pdf").write_bytes(b"pdf")

        status, result = self.request(f"/api/projects/{project_id}", "DELETE", csrf=self.csrf)
        self.assertEqual(status, 200)
        self.assertTrue(result["deleted"])
        self.assertGreaterEqual(result["files_removed"], 4)
        self.assertFalse(media_path.exists())
        self.assertFalse(staged_path.exists())
        self.assertFalse(manifest_path.exists())
        self.assertFalse(export_dir.exists())
        with self.app.connect() as db:
            self.assertIsNone(db.execute("SELECT id FROM projects WHERE id=?", (project_id,)).fetchone())
            self.assertEqual(db.execute("SELECT COUNT(*) AS n FROM assets WHERE project_id=?", (project_id,)).fetchone()["n"], 0)

    def test_project_delete_preserves_media_referenced_by_surviving_version(self):
        _, bundle = self.request("/api/projects", "POST", {"name": "Shared file owner", "target_seconds": 10}, self.csrf)
        project_id = bundle["project"]["id"]
        with self.app.connect() as db:
            shared_key = "shared-delete-" + project_id + ".png"
            owner_id, surviving_id = str(uuid.uuid4()), str(uuid.uuid4())
            at = self.app.now_iso()
            db.execute("INSERT INTO assets (id, project_id, filename, stored_name, mime, size, created_at) VALUES (?, ?, 'owner.png', ?, 'image/png', 6, ?)",
                       (owner_id, project_id, shared_key, at))
            db.execute("INSERT INTO assets (id, project_id, filename, stored_name, mime, size, created_at) VALUES (?, ?, 'survivor.png', ?, 'image/png', 1, ?)",
                       (surviving_id, self.pid, "survivor-" + project_id + ".png", at))
            db.execute("INSERT INTO asset_versions (id, asset_id, version_number, storage_key, mime_type, size, created_at) VALUES (?, ?, 'v999', ?, 'image/png', 1, ?)",
                       ("version-" + str(uuid.uuid4()), surviving_id, shared_key, at))
        media_path = self.app.MEDIA_ROOT / shared_key
        media_path.write_bytes(b"shared")

        status, result = self.request(f"/api/projects/{project_id}", "DELETE", csrf=self.csrf)
        self.assertEqual(status, 200)
        self.assertTrue(result["deleted"])
        self.assertTrue(media_path.is_file(), "a remaining asset version still references the shared storage key")
        with self.app.connect() as db:
            self.assertIsNotNone(db.execute("SELECT 1 FROM asset_versions WHERE asset_id=? AND storage_key=?",
                                             (surviving_id, shared_key)).fetchone())

    def test_project_delete_database_failure_does_not_unlink_files(self):
        import urllib.error
        _, bundle = self.request("/api/projects", "POST", {"name": "Failed delete", "target_seconds": 10}, self.csrf)
        project_id = bundle["project"]["id"]
        with self.app.connect() as db:
            asset_id = str(uuid.uuid4())
            db.execute("INSERT INTO assets (id, project_id, filename, stored_name, mime, size, created_at) VALUES (?, ?, 'delete-failure.png', 'delete-failure.png', 'image/png', 1, ?)",
                       (asset_id, project_id, self.app.now_iso()))
            db.execute("CREATE TRIGGER fail_project_delete BEFORE DELETE ON projects WHEN OLD.id='" + project_id + "' BEGIN SELECT RAISE(ABORT, 'test failure'); END")
        media_path = self.app.MEDIA_ROOT / "delete-failure.png"
        media_path.write_bytes(b"must survive rollback")

        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request(f"/api/projects/{project_id}", "DELETE", csrf=self.csrf)
        self.assertEqual(error.exception.code, 500)
        self.assertTrue(media_path.is_file(), "filesystem cleanup must happen only after successful DB commit")
        with self.app.connect() as db:
            self.assertIsNotNone(db.execute("SELECT 1 FROM projects WHERE id=?", (project_id,)).fetchone())
            self.assertIsNotNone(db.execute("SELECT 1 FROM assets WHERE id=?", (asset_id,)).fetchone())

    def test_embedded_excel_image_is_anchored_to_row(self):
        png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")
        sheet = '''<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>镜号</t></is></c><c r="B1" t="inlineStr"><is><t>画面描述</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>001</t></is></c><c r="B2" t="inlineStr"><is><t>测试画面</t></is></c></row></sheetData><drawing r:id="rId1"/></worksheet>'''.encode()
        drawing = b'''<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>2</xdr:col><xdr:row>1</xdr:row><xdr:colOff>0</xdr:colOff><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1" cy="1"/><xdr:pic><xdr:nvPicPr/><xdr:blipFill><a:blip r:embed="rId1"/></xdr:blipFill><xdr:spPr/></xdr:pic></xdr:oneCellAnchor></xdr:wsDr>'''
        def rels(target):
            return f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="{target}"/></Relationships>'.encode()
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as zf:
            zf.writestr("xl/worksheets/sheet1.xml", sheet)
            zf.writestr("xl/worksheets/_rels/sheet1.xml.rels", rels("../drawings/drawing1.xml"))
            zf.writestr("xl/drawings/drawing1.xml", drawing)
            zf.writestr("xl/drawings/_rels/drawing1.xml.rels", rels("../media/image1.png"))
            zf.writestr("xl/media/image1.png", png)
        rows, images = self.app.parse_xlsx_package(data.getvalue())
        self.assertEqual(len(rows), 2)
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]["data_row"], 1)
        query = urllib.parse.urlencode({"filename": "embedded.xlsx"})
        status, preview = self.request(f"/api/projects/{self.pid}/import-preview?{query}", "POST", data.getvalue(), self.csrf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.assertEqual(status, 200)
        self.assertEqual(preview["embedded_images"][0]["data_row"], 0)
        self.assertNotIn("data", preview["embedded_images"][0])
        mapping = {"number": {"col": 0}, "description": {"col": 1}}
        status, result = self.request(f"/api/projects/{self.pid}/import-commit", "POST", {"preview_id": preview["preview_id"], "mapping": mapping, "mode": "append"}, self.csrf)
        self.assertEqual(status, 200)
        self.assertEqual(result["images_imported"], 1)


if __name__ == "__main__":
    unittest.main()
