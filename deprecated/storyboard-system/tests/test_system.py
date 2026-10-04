#!/usr/bin/env python3
"""Comprehensive test suite for FrameForge V3.0 Master Specification."""

import http.cookiejar
import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path


class FrameForgeSystemTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ["STORYBOARD_DATA_ROOT"] = cls.temp.name
        os.environ["STORYBOARD_ADMIN_USER"] = "qa-admin"
        os.environ["STORYBOARD_ADMIN_PASSWORD"] = "FrameForge2026!QA"

        path = Path(__file__).resolve().parents[1] / "server.py"
        spec = importlib.util.spec_from_file_location("storyboard_server", path)
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()

        cls.httpd = cls.app.ThreadingHTTPServer(("127.0.0.1", 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.httpd.server_port}"

        jar = http.cookiejar.CookieJar()
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.temp.cleanup()

    def request(self, path, method="GET", data=None, csrf=None, content_type="application/json"):
        body = json.dumps(data).encode("utf-8") if isinstance(data, (dict, list)) else data
        headers = {"Content-Type": content_type}
        if csrf:
            headers["X-CSRF-Token"] = csrf
        req = urllib.request.Request(self.base + path, body, headers, method=method)
        with self.client.open(req) as res:
            raw = res.read()
            return res.status, json.loads(raw) if "json" in res.headers.get("Content-Type", "") else raw

    # 1. SMPTE Timecode Unit Tests (Spec Section 19-22)
    def test_smpte_timecode_engine(self):
        # 25 fps non-drop frame
        tc = self.app.frames_to_tc(75, 25.0)
        self.assertEqual(tc, "00:00:03:00")
        frames = self.app.tc_to_frames("01:00:03:12", 25.0)
        self.assertEqual(frames, 90087)

        # 24 fps
        tc_24 = self.app.frames_to_tc(48, 24.0)
        self.assertEqual(tc_24, "00:00:02:00")

        # 29.97 Drop-Frame calculation (SMPTE standard)
        tc_df = self.app.frames_to_tc(1800, 29.97, is_drop_frame=True)
        self.assertTrue(";" in tc_df)

    # 2. VO Auto-Timing Engine Tests (Spec Section 23-30)
    def test_vo_auto_timing_calculation(self):
        shots = [
            {"id": "s1", "voiceover": "渤海潮涌，津门向新！", "locked": False, "duration_frames": 75},
            {"id": "s2", "voiceover": "千年商脉奔流不息，时代浪潮浩荡向前。", "locked": False, "duration_frames": 75},
            {"id": "s3", "voiceover": "产品展示镜头", "locked": True, "duration_frames": 50}
        ]
        # Speech-rate estimates replace a fixed project budget. Locked = 50f.
        result = self.app.compute_auto_timing(shots, 10.0, 25.0)
        self.assertEqual(result[2]["duration_frames"], 50)  # Locked preserved
        total_frames = sum(s["duration_frames"] for s in result)
        self.assertEqual(total_frames, sum(self.app.estimate_narration_frames(s["voiceover"], 25.0) for s in shots[:2]) + 50)
        # s2 has more text & punctuation than s1 -> should get more frames.
        self.assertGreater(result[1]["duration_frames"], result[0]["duration_frames"])

        slower = self.app.compute_auto_timing([dict(shot) for shot in shots], 10.0, 25.0, 0.5)
        faster = self.app.compute_auto_timing([dict(shot) for shot in shots], 10.0, 25.0, 2.0)
        self.assertGreater(sum(s["duration_frames"] for s in slower), sum(s["duration_frames"] for s in faster))

        dialogue_only = [{"id": "dialogue", "voiceover": "", "dialogue": "Take two, please.", "locked": False, "duration_frames": 75}]
        self.app.compute_auto_timing(dialogue_only, 10.0, 25.0, 1.0)
        self.assertEqual(dialogue_only[0]["duration_frames"], self.app.estimate_narration_frames("Take two, please.", 25.0))

        picture_only = [
            {"id": "p1", "voiceover": "", "locked": False, "duration_frames": 80},
            {"id": "p2", "voiceover": "有旁白的镜头。", "locked": False, "duration_frames": 80},
            {"id": "p3", "voiceover": "", "locked": False, "duration_frames": 80},
        ]
        timed_picture_only = self.app.compute_auto_timing(picture_only, 12.0, 25.0)
        self.assertEqual(timed_picture_only[0]["duration_frames"], 80)
        self.assertEqual(timed_picture_only[2]["duration_frames"], 80)
        self.assertEqual(sum(s["duration_frames"] for s in timed_picture_only), 160 + self.app.estimate_narration_frames("有旁白的镜头。", 25.0))

        # Very short narration still receives the shared 0.6 second minimum.
        short_target = [
            {"id": "short-1", "voiceover": "一句话", "locked": False, "duration_frames": 75},
            {"id": "short-2", "voiceover": "另一句话", "locked": False, "duration_frames": 75},
            {"id": "short-3", "voiceover": "第三句话", "locked": False, "duration_frames": 75},
        ]
        short_result = self.app.compute_auto_timing(short_target, 1.0, 25.0)
        self.assertEqual(sum(s["duration_frames"] for s in short_result), sum(self.app.estimate_narration_frames(s["voiceover"], 25.0) for s in short_target))
        self.assertTrue(all(s["duration_frames"] >= 15 for s in short_result))

    def test_auto_timing_api_rate_bounds_and_project_target(self):
        _, session = self.request("/api/login", "POST", {"username": "qa-admin", "password": "FrameForge2026!QA"})
        csrf = session["csrf"]
        status, bundle = self.request("/api/projects", "POST", {"name": "Timing Rate Contract", "fps": 25, "target_seconds": 37}, csrf)
        self.assertEqual(status, 201)
        project_id = bundle["project"]["id"]
        shot_id = bundle["shots"][0]["id"]
        with self.app.connect() as db:
            db.execute("UPDATE shots SET voiceover=?, duration_frames=75 WHERE id=?", ("A short line, then another.", shot_id))
            db.commit()

        import urllib.error
        for invalid in (0.49, 2.01, "fast", True):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.request(f"/api/projects/{project_id}/auto-timing", "POST", {"speech_rate": invalid}, csrf)
            self.assertEqual(error.exception.code, 400)
        with self.app.connect() as db:
            self.assertEqual(db.execute("SELECT duration_frames FROM shots WHERE id=?", (shot_id,)).fetchone()[0], 75)

        status, slow = self.request(f"/api/projects/{project_id}/auto-timing", "POST", {"speech_rate": 0.5}, csrf)
        self.assertEqual(status, 200)
        status, fast = self.request(f"/api/projects/{project_id}/auto-timing", "POST", {"speech_rate": 2.0}, csrf)
        self.assertEqual(status, 200)
        self.assertGreater(slow["shots"][0]["duration_frames"], fast["shots"][0]["duration_frames"])
        self.assertEqual(slow["project"]["target_seconds"], 37)
        self.assertEqual(fast["project"]["target_seconds"], 37)

    # 3. Complete Production API Workflow
    def test_complete_production_workflow(self):
        # Login
        status, session = self.request("/api/login", "POST", {
            "username": "qa-admin",
            "password": "FrameForge2026!QA"
        })
        self.assertEqual(status, 200)
        csrf = session["csrf"]

        # Create Project
        status, bundle = self.request("/api/projects", "POST", {
            "name": "QA TVC Commercial",
            "production_type": "tvc",
            "fps": 25.0,
            "target_seconds": 30.0,
            "aspect_ratio": "16:9"
        }, csrf)
        self.assertEqual(status, 201)
        pid = bundle["project"]["id"]
        self.assertEqual(bundle["project"]["production_type"], "tvc")

        # Update Shots with Production Methods
        shots = bundle["shots"]
        shots[0]["primary_method"] = "STOCK"
        shots[0]["title"] = "日出素材采购"
        shots[0]["voiceover"] = "晨光破晓，万物复苏。"

        shots[1]["primary_method"] = "LIVE"
        shots[1]["title"] = "车队现场拍摄"
        shots[1]["shot_size"] = "特写"
        shots[1]["lens"] = "85mm"

        shots[2]["primary_method"] = "AE"
        shots[2]["title"] = "地图线路包装"

        status, saved = self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": shots}, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(saved["shots"][0]["primary_method"], "STOCK")
        self.assertEqual(saved["shots"][1]["lens"], "85mm")

        # Auto Timing API
        status, timed = self.request(f"/api/projects/{pid}/auto-timing", "POST", {"speech_rate": 1.25}, csrf)
        self.assertEqual(status, 200)
        self.assertEqual(timed["project"]["target_seconds"], 30)  # Auto timing leaves project target metadata alone.
        self.assertEqual(timed["shots"][0]["duration_frames"], self.app.estimate_narration_frames("晨光破晓，万物复苏。", 25, 1.25))
        self.assertEqual(timed["total_frames"], sum(shot["duration_frames"] for shot in timed["shots"]))

        # Add Comment
        sid = saved["shots"][0]["id"]
        status, c_res = self.request(f"/api/shots/{sid}/comments", "POST", {
            "text": "镜头建议换成黄昏日落素材",
            "role": "Director"
        }, csrf)
        self.assertEqual(status, 201)

        # Anonymous Share Publish
        status, share_res = self.request(f"/api/projects/{pid}/share", "POST", {
            "is_permanent": True,
            "allow_download": True
        }, csrf)
        self.assertEqual(status, 200)
        token = share_res["token"]

        # Public Anonymous Access (Zero login required)
        status, public_data = self.request(f"/api/shares/{token}")
        self.assertEqual(status, 200)
        self.assertEqual(len(public_data["bundle"]["shots"]), len(shots))

        # Deliverables Exporters
        status, edl_raw = self.request(f"/api/projects/{pid}/export/edl", "GET", None, csrf)
        self.assertEqual(status, 200)
        self.assertIn("TITLE:", edl_raw.decode("utf-8") if isinstance(edl_raw, bytes) else str(edl_raw))

        status, otio_data = self.request(f"/api/projects/{pid}/export/otio", "GET", None, csrf)
        self.assertEqual(status, 200)
        otio_json = otio_data if isinstance(otio_data, dict) else json.loads(otio_data.decode("utf-8"))
        self.assertEqual(otio_json["OTIO_SCHEMA"], "Timeline.1")

        status, srt_raw = self.request(f"/api/projects/{pid}/export/srt", "GET", None, csrf)
        self.assertEqual(status, 200)
        self.assertIn("-->", srt_raw.decode("utf-8-sig") if isinstance(srt_raw, bytes) else str(srt_raw))

        status, csv_raw = self.request(f"/api/projects/{pid}/export/shooting_list", "GET", None, csrf)
        self.assertEqual(status, 200)
        self.assertTrue(len(csv_raw) > 0)

    # 4. Excel Import Header Confidence Mapping
    def test_excel_header_mapping(self):
        headers = ["镜号", "画面描述", "旁白", "制作方式", "景别", "焦段", "时长"]
        mapping = self.app.map_headers(headers)
        self.assertIn("number", mapping)
        self.assertIn("description", mapping)
        self.assertIn("voiceover", mapping)
        self.assertIn("primary_method", mapping)
        self.assertGreaterEqual(mapping["number"]["confidence"], 0.9)

    def test_v5_real_routes_and_persistence(self):
        """Exercise the routes that were previously UI-only or memory-only."""
        csrf = self.request("/api/session")[1]["csrf"]
        status, bundle = self.request("/api/projects", "POST", {
            "name": "V5 persistence QA", "production_type": "documentary", "fps": 25,
            "target_seconds": 20, "start_tc": "01:00:00:00"
        }, csrf)
        self.assertEqual(status, 201)
        pid = bundle["project"]["id"]
        original_count = len(bundle["shots"])

        status, created = self.request(f"/api/projects/{pid}/shots", "POST", {
            "number": "006", "title": "真实新增镜头", "duration_frames": 50,
            "description": "新增后重新读取仍存在。", "primary_method": "LIVE"
        }, csrf)
        self.assertEqual(status, 201)
        self.assertEqual(len(created["shots"]), original_count + 1)
        new_id = created["shots"][-1]["id"]
        status, reloaded = self.request(f"/api/projects/{pid}")
        self.assertEqual(status, 200)
        self.assertIn(new_id, [shot["id"] for shot in reloaded["shots"]])

        csv_body = "镜号,画面描述,旁白,时长\nCSV-1,CSV画面,CSV旁白,2\n".encode("utf-8-sig")
        status, preview = self.request(f"/api/projects/{pid}/import-preview?filename=shots.csv", "POST", csv_body, csrf, "text/csv")
        self.assertEqual(status, 200)
        self.assertEqual(preview["total_rows"], 1)
        self.assertEqual(len(preview["rows"]), 1)
        status, imported = self.request(f"/api/projects/{pid}/import-commit", "POST", {
            "preview_id": preview["preview_id"], "mapping": {key: {"col": value["col"]} for key, value in preview["mapping"].items()}
        }, csrf)
        self.assertEqual(status, 200)
        self.assertGreaterEqual(imported["imported"], 1)

        png = b"\x89PNG\r\n\x1a\n" + b"v5-test"
        status, media = self.request(f"/api/projects/{pid}/media?shot_id={new_id}&filename=qa.png", "POST", png, csrf, "image/png")
        self.assertEqual(status, 201)
        status, media_body = self.request(f"/media/{media['id']}")
        self.assertEqual(status, 200)
        self.assertEqual(media_body[:8], b"\x89PNG\r\n\x1a\n")
        replacement_png = b"\x89PNG\r\n\x1a\n" + b"v5-replacement"
        status, replacement = self.request(
            f"/api/projects/{pid}/media?shot_id={new_id}&asset_id={media['id']}&filename=qa-replacement.png",
            "POST", replacement_png, csrf, "image/png"
        )
        self.assertEqual(status, 201)
        self.assertNotEqual(replacement["id"], media["id"])
        self.assertEqual(replacement["version"], "v002")
        status, versioned_bundle = self.request(f"/api/projects/{pid}")
        self.assertEqual(status, 200)
        versioned_asset = next(asset for asset in versioned_bundle["assets"] if asset["id"] == media["id"])
        self.assertEqual([v["version_number"] for v in versioned_asset["versions"]], ["v001"])
        status, old_media_body = self.request(f"/media/{media['id']}?version=v001")
        self.assertEqual(status, 200)
        self.assertEqual(old_media_body, png)
        self.assertEqual(self.request(f"/media/{replacement['id']}")[1], replacement_png)
        replaced_shot = next(shot for shot in versioned_bundle["shots"] if shot["id"] == new_id)
        self.assertEqual(replaced_shot["panels"][0]["media_id"], replacement["id"])
        restored_panel = {**replaced_shot["panels"][0], "media_id": media["id"]}
        self.request(f"/api/projects/{pid}/shots", "PUT", {"shots": [{"id": new_id,
            "base_revision": replaced_shot["revision"], "changed_fields": ["panels"], "panels": [restored_panel]}]}, csrf)
        restored = next(shot for shot in self.request(f"/api/projects/{pid}")[1]["shots"] if shot["id"] == new_id)
        self.assertEqual(restored["panels"][0]["media_id"], media["id"])
        self.assertEqual(self.request(f"/media/{restored['panels'][0]['media_id']}")[1], png)

        status, share = self.request(f"/api/projects/{pid}/share", "POST", {
            "is_permanent": True, "allow_download": True, "password": "Share-QA-2026"
        }, csrf)
        self.assertEqual(status, 200)
        self.assertTrue(share["password_required"])
        public = urllib.request.build_opener()
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            public.open(urllib.request.Request(f"{self.base}/api/shares/{share['token']}"))
        self.assertEqual(ctx.exception.code, 401)
        access_data = json.dumps({"password": "Share-QA-2026"}).encode("utf-8")
        access_req = urllib.request.Request(f"{self.base}/api/shares/{share['token']}/access", access_data, {"Content-Type": "application/json"}, method="POST")
        with public.open(access_req) as response:
            self.assertEqual(response.status, 200)

        status, deleted = self.request(f"/api/shots/{new_id}", "DELETE", None, csrf)
        self.assertEqual(status, 204)
        status, after_delete = self.request(f"/api/projects/{pid}")
        self.assertEqual(status, 200)
        self.assertNotIn(new_id, [shot["id"] for shot in after_delete["shots"]])

        status, ai = self.request("/api/ai/capabilities")
        self.assertEqual(status, 200)
        self.assertFalse(ai["enabled"])

    def test_viewer_cannot_mutate(self):
        """Read-only roles may inspect projects but cannot mutate them."""
        viewer_id = "qa-viewer-user"
        with self.app.connect() as db:
            db.execute(
                "INSERT OR REPLACE INTO users (id, username, password_hash, role, display_name, created_at) VALUES (?,?,?,?,?,?)",
                (viewer_id, "qa-viewer", self.app.password_hash("Viewer-QA-2026"), "viewer", "只读审片人", self.app.now_iso())
            )
        viewer_cj = http.cookiejar.CookieJar()
        viewer = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(viewer_cj))
        login_req = urllib.request.Request(
            f"{self.base}/api/login", json.dumps({"username": "qa-viewer", "password": "Viewer-QA-2026"}).encode(),
            {"Content-Type": "application/json"}, method="POST"
        )
        with viewer.open(login_req) as response:
            session = json.loads(response.read().decode())
        create_req = urllib.request.Request(
            f"{self.base}/api/projects", json.dumps({"name": "should-not-create"}).encode(),
            {"Content-Type": "application/json", "X-CSRF-Token": session["csrf"]}, method="POST"
        )
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            viewer.open(create_req)
        self.assertEqual(ctx.exception.code, 403)

    def test_login_rate_limit_has_30_second_countdown_payload(self):
        """The server keeps throttling and exposes the requested countdown."""
        username = "rate-limit-qa"
        for _ in range(5):
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                self.request("/api/login", "POST", {"username": username, "password": "wrong"})
            self.assertEqual(ctx.exception.code, 401)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.request("/api/login", "POST", {"username": username, "password": "wrong"})
        self.assertEqual(ctx.exception.code, 429)
        payload = json.loads(ctx.exception.read())
        self.assertEqual(payload, {"error": "错误次数过多", "retry_after": 30})


if __name__ == "__main__":
    unittest.main(verbosity=2)
