"""Unit tests for the FastAPI application routes and dependency injection."""

import os
import sys
import unittest

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TEST_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from fastapi.testclient import TestClient
from fastapi_app.main import create_app


class TestFastAPIApp(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["engine"], "fastapi")

    def test_openapi_schema_generated(self):
        res = self.client.get("/api/openapi.json")
        self.assertEqual(res.status_code, 200)
        schema = res.json()
        self.assertEqual(schema["info"]["title"], "FrameForge Modular API")
        self.assertIn("/api/health", schema["paths"])
        self.assertIn("/api/projects", schema["paths"])
        self.assertIn("/api/shots/{shot_id}", schema["paths"])
        self.assertIn("/api/v1/presence/heartbeat", schema["paths"])

    def test_presence_heartbeat_via_fastapi(self):
        payload = {
            "production_id": "proj-fastapi-1",
            "user_id": "user-fastapi-1",
            "display_name": "Test User",
            "workspace": "table",
            "presence_state": "viewing",
        }
        res = self.client.post("/api/v1/presence/heartbeat", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ok"])
        self.assertEqual(len(data["presence"]), 1)
        self.assertEqual(data["presence"][0]["user_id"], "user-fastapi-1")

    def test_auth_protection_on_projects(self):
        res = self.client.get("/api/projects")
        self.assertEqual(res.status_code, 401)


if __name__ == "__main__":
    unittest.main()
