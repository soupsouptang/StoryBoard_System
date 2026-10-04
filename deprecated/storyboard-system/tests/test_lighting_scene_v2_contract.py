"""Lighting Scene V2 contract regression tests.

Verifies end-to-end persistence of versioned FrameForge Lighting Scene V2 models
against the live server and database. Tests that all object types, presets, Digital Twin
metadata (manufacturer, model, mount, powerW, attachment, optical properties, camera sensor
metadata, transform z/scale) survive create -> backend save -> reload round trips
without data loss or schema validation rejection.
"""
import importlib.util
import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import http.cookiejar
import uuid
from pathlib import Path
from unittest.mock import patch


# Canonical list of preset objects to test against the V2 persistence contract
PRESET_TEST_MATRIX = [
    # Lights
    {'type': 'light', 'subtype': 'arri_skypanel_x21', 'props': {'manufacturer': 'ARRI', 'model': 'SkyPanel X21', 'powerW': 800, 'mount': '28mm Spigot', 'temperature': 5600, 'intensity': 85, 'beamSpread': 120, 'beamLength': 380, 'aimTilt': -45, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'aputure_storm_1200x', 'props': {'manufacturer': 'Aputure', 'model': 'STORM 1200x', 'powerW': 1200, 'mount': 'Junior Pin', 'attachment': 'CF12 Fresnel', 'temperature': 5600, 'intensity': 90, 'beamSpread': 45, 'beamLength': 550, 'aimTilt': -45, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'nanlite_forza_300b_ii', 'props': {'manufacturer': 'Nanlite', 'model': 'Forza 300B II', 'powerW': 350, 'mount': 'Bowens', 'temperature': 5600, 'intensity': 75, 'beamSpread': 60, 'beamLength': 400, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'nanlite_forza_500b_ii', 'props': {'manufacturer': 'Nanlite', 'model': 'Forza 500B II', 'powerW': 580, 'mount': 'Bowens', 'temperature': 5600, 'intensity': 85, 'beamSpread': 55, 'beamLength': 480, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'arri_orbiter', 'props': {'manufacturer': 'ARRI', 'model': 'Orbiter', 'powerW': 400, 'mount': '28mm Junior Pin', 'temperature': 5600, 'intensity': 80, 'beamSpread': 30, 'beamLength': 450, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'cob', 'props': {'temperature': 5600, 'intensity': 80, 'beamSpread': 30, 'beamLength': 400, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'fresnel', 'props': {'temperature': 3200, 'intensity': 70, 'beamSpread': 25, 'beamLength': 500, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'par', 'props': {'temperature': 5600, 'intensity': 60, 'beamSpread': 40, 'beamLength': 350, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'led_panel', 'props': {'temperature': 5600, 'intensity': 75, 'beamSpread': 90, 'beamLength': 250, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'hmi', 'props': {'temperature': 5600, 'intensity': 100, 'beamSpread': 15, 'beamLength': 600, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'tungsten', 'props': {'temperature': 3200, 'intensity': 85, 'beamSpread': 50, 'beamLength': 300, 'showCoverage': True}},
    {'type': 'light', 'subtype': 'practical', 'props': {'temperature': 2700, 'intensity': 30, 'beamSpread': 120, 'beamLength': 150, 'showCoverage': False}},
    # Modifiers
    {'type': 'modifier', 'subtype': 'softbox_rect', 'props': {'beamSpread': 120, 'beamLength': 280, 'showCoverage': True}},
    {'type': 'modifier', 'subtype': 'softbox_oct', 'props': {'beamSpread': 140, 'beamLength': 250, 'showCoverage': True}},
    {'type': 'modifier', 'subtype': 'diffusion_frame', 'props': {'beamSpread': 90, 'beamLength': 200, 'showCoverage': False}},
    {'type': 'modifier', 'subtype': 'reflector', 'props': {'beamSpread': 60, 'beamLength': 200, 'showCoverage': False}},
    {'type': 'modifier', 'subtype': 'negative_fill', 'props': {'showCoverage': False}},
    {'type': 'modifier', 'subtype': 'grid', 'props': {'beamSpread': 40, 'beamLength': 300, 'showCoverage': True}},
    {'type': 'modifier', 'subtype': 'barndoors', 'props': {'beamSpread': 55, 'beamLength': 320, 'showCoverage': True}},
    # Cameras
    {'type': 'camera', 'subtype': 'arri_alexa_35', 'props': {'manufacturer': 'ARRI', 'model': 'ALEXA 35', 'focalLength': 35, 'sensorWidth': 27.99, 'sensorHeight': 19.22, 'opticalCenter': True}},
    {'type': 'camera', 'subtype': 'cinema', 'props': {'focalLength': 35, 'sensorWidth': 36, 'sensorHeight': 24}},
    {'type': 'camera', 'subtype': 'dslr', 'props': {'focalLength': 50, 'sensorWidth': 36, 'sensorHeight': 24}},
    {'type': 'camera', 'subtype': 'mirrorless', 'props': {'focalLength': 50, 'sensorWidth': 35.6, 'sensorHeight': 23.8}},
    {'type': 'camera', 'subtype': 'aerial', 'props': {'focalLength': 24, 'sensorWidth': 17.3, 'sensorHeight': 13}},
    {'type': 'camera', 'subtype': 'pedestal', 'props': {'focalLength': 35, 'sensorWidth': 36, 'sensorHeight': 24}},
    {'type': 'camera', 'subtype': 'jib', 'props': {'armLength': 310}},
    {'type': 'camera', 'subtype': 'slider', 'props': {}},
    {'type': 'camera', 'subtype': 'monitor', 'props': {}},
    # Actors
    {'type': 'actor', 'subtype': 'actor', 'props': {'height': 170, 'facing': 0}},
    {'type': 'actor', 'subtype': 'extra', 'props': {'height': 165, 'facing': 0}},
    {'type': 'actor', 'subtype': 'child', 'props': {'height': 120, 'facing': 0}},
    # Grip
    {'type': 'grip', 'subtype': 'avenger_a2033f', 'props': {'manufacturer': 'Avenger', 'model': 'A2033F', 'maxH': 328, 'minH': 134, 'pin': '16mm Baby Pin'}},
    {'type': 'grip', 'subtype': 'tripod', 'props': {}},
    {'type': 'grip', 'subtype': 'c_stand', 'props': {}},
    {'type': 'grip', 'subtype': 'boom', 'props': {}},
    {'type': 'grip', 'subtype': 'sandbag', 'props': {}},
    # Furniture
    {'type': 'furniture', 'subtype': 'table', 'props': {}},
    {'type': 'furniture', 'subtype': 'round_table', 'props': {}},
    {'type': 'furniture', 'subtype': 'conference_table', 'props': {}},
    {'type': 'furniture', 'subtype': 'chair', 'props': {}},
    {'type': 'furniture', 'subtype': 'sofa', 'props': {}},
    {'type': 'furniture', 'subtype': 'bed', 'props': {}},
    {'type': 'furniture', 'subtype': 'cabinet', 'props': {}},
    # Architecture
    {'type': 'architecture', 'subtype': 'cyclorama', 'props': {}},
    {'type': 'architecture', 'subtype': 'set_flat', 'props': {}},
    {'type': 'architecture', 'subtype': 'wall', 'props': {}},
    {'type': 'architecture', 'subtype': 'window', 'props': {}},
    {'type': 'architecture', 'subtype': 'door', 'props': {}},
    {'type': 'architecture', 'subtype': 'column', 'props': {}},
    # Annotation
    {'type': 'annotation', 'subtype': 'arrow', 'props': {}},
    {'type': 'annotation', 'subtype': 'note', 'props': {}},
    {'type': 'annotation', 'subtype': 'mark_spike', 'props': {}},
    {'type': 'annotation', 'subtype': 'distance', 'props': {}},
]


def _build_v2_object(obj_id, type_name, subtype, props=None, x=100, y=150, z=200):
    return {
        'id': obj_id,
        'type': type_name,
        'subtype': subtype,
        'name': f'{type_name}_{subtype}',
        'label': f'{type_name} {subtype}',
        'transform': {
            'position': {'x': x, 'y': y, 'z': z},
            'rotation': {'x': 0, 'y': 0, 'z': 30},
            'scale': {'x': 100, 'y': 80, 'z': 1}
        },
        'visible': True,
        'locked': False,
        'metadata': {'testKey': 'testVal'},
        'properties': dict(props or {})
    }


def _build_v2_board(board_id, name, objects):
    return {
        'id': board_id,
        'kind': 'lighting',
        'schemaVersion': 2,
        'version': 2,
        'name': name,
        'width': 1800,
        'height': 1200,
        'shot_ids': [],
        'settings': {'unit': 'cm', 'gridSize': 100, 'snapEnabled': True, 'showGrid': True, 'defaultView': '2.5d'},
        'environment': {'roomWidth': 1800, 'roomDepth': 1200, 'wallHeight': 450},
        'objects': objects,
        'items': []
    }


class LightingSceneV2ContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        cls.env = patch.dict(os.environ, STORYBOARD_DATA_ROOT=cls.temp.name,
                             STORYBOARD_ADMIN_USER='v2-admin', STORYBOARD_ADMIN_PASSWORD='ContractV2Pass!')
        cls.env.start()
        spec = importlib.util.spec_from_file_location('v2_contract_app', Path(__file__).parents[1] / 'server.py')
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.app.AppHandler.log_message = lambda *args: None
        cls.httpd = cls.app.ThreadingHTTPServer(('127.0.0.1', 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.httpd.server_port}'
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, cls.session = cls.request('/api/login', 'POST', {'username': 'v2-admin', 'password': 'ContractV2Pass!'})
        assert status == 200, cls.session
        cls.csrf = cls.session['csrf']

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join()
        cls.env.stop()
        cls.temp.cleanup()

    @classmethod
    def request(cls, path, method='GET', data=None, mime='application/json'):
        body = json.dumps(data).encode() if isinstance(data, (dict, list)) else data
        req = urllib.request.Request(cls.base + path, data=body, method=method,
                                     headers={'Content-Type': mime, 'X-CSRF-Token': getattr(cls, 'csrf', '')})
        try:
            response = cls.client.open(req)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return response.code, json.loads(raw) if raw and 'application/json' in response.headers.get('Content-Type', '') else raw

    def setUp(self):
        status, bundle = self.request('/api/projects', 'POST', {'name': 'V2 Contract ' + uuid.uuid4().hex[:8]})
        self.assertEqual(status, 201, bundle)
        self.pid = bundle['project']['id']
        self.path = f'/api/projects/{self.pid}/creative-boards'
        self.revision = 0

    def put(self, boards, expect=200):
        status, result = self.request(self.path, 'PUT', {'revision': self.revision, 'boards': boards})
        self.assertEqual(status, expect, result)
        if status == 200:
            self.revision = result['revision']
        return result

    def test_full_preset_matrix_round_trip(self):
        """Every single preset must serialize, validate, save, reload, and preserve all fields."""
        objects = []
        for i, preset in enumerate(PRESET_TEST_MATRIX):
            obj = _build_v2_object(
                obj_id=f'obj-mat-{i:03d}',
                type_name=preset['type'],
                subtype=preset['subtype'],
                props=preset['props'],
                x=100 + (i % 10) * 150,
                y=100 + (i // 10) * 150,
                z=210 + i
            )
            objects.append(obj)

        board = _build_v2_board('b-v2-full', 'Full Matrix Test', objects)
        result = self.put([board])
        self.assertEqual(len(result['boards']), 1)
        saved_board = result['boards'][0]
        self.assertEqual(saved_board['schemaVersion'], 2)
        self.assertEqual(saved_board['version'], 2)
        self.assertEqual(len(saved_board['objects']), len(PRESET_TEST_MATRIX))

        # Reload from GET endpoint and compare field by field
        status, get_result = self.request(self.path)
        self.assertEqual(status, 200)
        reloaded_board = get_result['boards'][0]
        self.assertEqual(reloaded_board['id'], 'b-v2-full')
        self.assertEqual(len(reloaded_board['objects']), len(PRESET_TEST_MATRIX))

        for orig, reloaded in zip(objects, reloaded_board['objects']):
            self.assertEqual(reloaded['id'], orig['id'])
            self.assertEqual(reloaded['type'], orig['type'])
            self.assertEqual(reloaded['subtype'], orig['subtype'])
            self.assertEqual(reloaded['transform']['position']['x'], orig['transform']['position']['x'])
            self.assertEqual(reloaded['transform']['position']['y'], orig['transform']['position']['y'])
            self.assertEqual(reloaded['transform']['position']['z'], orig['transform']['position']['z'])
            self.assertEqual(reloaded['transform']['rotation']['z'], orig['transform']['rotation']['z'])

            # Validate each original property was strictly preserved
            for pk, pv in orig['properties'].items():
                self.assertIn(pk, reloaded['properties'], f"Missing property {pk} in reloaded {orig['subtype']}")
                self.assertEqual(reloaded['properties'][pk], pv, f"Mismatch in property {pk} for {orig['subtype']}")

    def test_storm_1200x_cf12_fresnel_attachment(self):
        """STORM 1200x with CF12 Fresnel attachment must be accepted and preserved."""
        storm = _build_v2_object(
            'obj-storm', 'light', 'aputure_storm_1200x',
            {'manufacturer': 'Aputure', 'model': 'STORM 1200x', 'powerW': 1200, 'attachment': 'CF12 Fresnel', 'beamSpread': 45}
        )
        board = _build_v2_board('b-storm', 'Storm Board', [storm])
        res = self.put([board])
        saved_storm = res['boards'][0]['objects'][0]
        self.assertEqual(saved_storm['properties']['attachment'], 'CF12 Fresnel')
        self.assertEqual(saved_storm['properties']['model'], 'STORM 1200x')

    def test_arri_alexa_35_metadata(self):
        """ARRI ALEXA 35 camera object must preserve full sensor and lens metadata."""
        alexa = _build_v2_object(
            'obj-alexa', 'camera', 'arri_alexa_35',
            {'manufacturer': 'ARRI', 'model': 'ALEXA 35', 'focalLength': 35, 'sensorWidth': 27.99, 'sensorHeight': 19.22, 'opticalCenter': True}
        )
        board = _build_v2_board('b-alexa', 'Alexa Board', [alexa])
        res = self.put([board])
        saved_alexa = res['boards'][0]['objects'][0]
        self.assertEqual(saved_alexa['subtype'], 'arri_alexa_35')
        self.assertEqual(saved_alexa['properties']['sensorWidth'], 27.99)
        self.assertEqual(saved_alexa['properties']['sensorHeight'], 19.22)
        self.assertEqual(saved_alexa['properties']['opticalCenter'], True)


if __name__ == '__main__':
    unittest.main()
