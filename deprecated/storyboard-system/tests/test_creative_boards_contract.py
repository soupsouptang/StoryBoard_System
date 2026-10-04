"""Creative board save-contract regression tests.

These run against the real HTTP server and the real SQLite backend, so the
two-layer field validation in creative_boards.normalize_boards is exercised
end to end. Earlier coverage used a mock API that accepted any object, which
is why the `z` (height above floor) mismatch between static/creative-boards.js
and the backend reached the browser.

Covers: mixed moodboard+lighting saves, z defaults/migration for boards saved
before the field existed, type constraints on both validation layers, and
backup export/import validation of the same contract.
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


def _board(board_id, kind, items, shot_ids=()):
    return {'id': board_id, 'kind': kind, 'name': board_id, 'width': 1600, 'height': 1000,
            'shot_ids': list(shot_ids), 'items': items}


def _item(item_id, typ, **extra):
    return dict({'id': item_id, 'type': typ, 'x': 80, 'y': 80, 'width': 100, 'height': 100}, **extra)


class CreativeBoardsContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        cls.env = patch.dict(os.environ, STORYBOARD_DATA_ROOT=cls.temp.name,
                             STORYBOARD_ADMIN_USER='cb-admin', STORYBOARD_ADMIN_PASSWORD='Contract2026!')
        cls.env.start()
        spec = importlib.util.spec_from_file_location('cb_contract_app', Path(__file__).parents[1] / 'server.py')
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.app.AppHandler.log_message = lambda *args: None
        cls.httpd = cls.app.ThreadingHTTPServer(('127.0.0.1', 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.httpd.server_port}'
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, cls.session = cls.request('/api/login', 'POST', {'username': 'cb-admin', 'password': 'Contract2026!'})
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
        status, bundle = self.request('/api/projects', 'POST', {'name': 'Contract ' + uuid.uuid4().hex[:8]})
        self.assertEqual(status, 201, bundle)
        self.pid = bundle['project']['id']
        self.sid = bundle['shots'][0]['id']
        self.path = f'/api/projects/{self.pid}/creative-boards'
        self.revision = 0

    def put(self, boards, expect=200):
        status, result = self.request(self.path, 'PUT', {'revision': self.revision, 'boards': boards})
        self.assertEqual(status, expect, result)
        if status == 200:
            self.revision = result['revision']
        return result

    # -- z belongs to spatial lighting objects --------------------------------

    def test_lighting_items_round_trip_z(self):
        result = self.put([_board('b1', 'lighting', [_item('key', 'light', z=215, rotation=30)])])
        self.assertEqual(result['boards'][0]['items'][0]['z'], 215)
        self.assertEqual(self.request(self.path)[1], result, 'reload must match the save receipt')

    def test_lighting_items_default_and_migrate_z(self):
        """Boards saved before z existed still load, and get the 0 default."""
        result = self.put([_board('b1', 'lighting', [_item('key', 'light'), _item('cam', 'camera', z=130)])])
        by_id = {item['id']: item for item in result['boards'][0]['items']}
        self.assertEqual(by_id['key']['z'], 0, 'missing z migrates to the floor')
        self.assertEqual(by_id['cam']['z'], 130)

    def test_z_rejected_for_moodboard_items(self):
        boards = [_board('m', 'moodboard', [_item('n', 'note', text='hi', z=40)])]
        status, result = self.request(self.path, 'PUT', {'revision': 0, 'boards': boards})
        self.assertEqual(status, 400, 'moodboard items must not carry spatial fields')
        self.assertEqual(self.request(self.path)[1], {'revision': 0, 'boards': []}, 'a rejected save must not write')

    def test_z_rejected_on_both_validation_layers(self):
        """The per-type extras check must reject z even when the key whitelist passes."""
        for typ in ('note', 'color'):
            boards = [_board('m', 'moodboard', [_item('n', typ, text='hi', color='#fff2b3', z=40)])]
            self.assertEqual(self.request(self.path, 'PUT', {'revision': 0, 'boards': boards})[0], 400)
        boards = [_board('m', 'moodboard', [_item('i', 'image', asset_id='missing', z=10)])]
        self.assertEqual(self.request(self.path, 'PUT', {'revision': 0, 'boards': boards})[0], 400)

    def test_z_bounds(self):
        for value in (-1, 2001, 'high', None, float('nan')):
            boards = [_board('b', 'lighting', [_item('key', 'light', z=value)])]
            self.assertEqual(self.request(self.path, 'PUT', {'revision': 0, 'boards': boards})[0], 400, value)

    # -- mixed boards ---------------------------------------------------------

    def test_mixed_boards_save_and_reload(self):
        mood = _board('mood', 'moodboard', [_item('n', 'note', text='tone', color='#fff2b3'),
                                            _item('c', 'color', color='#64748b')], [self.sid])
        light = _board('lite', 'lighting', [_item('key', 'light', z=200, intensity=80),
                                            _item('stand', 'tripod', z=0),
                                            _item('arrow', 'arrow', width=240, height=40, z=0)])
        result = self.put([mood, light])
        self.assertEqual([b['kind'] for b in result['boards']], ['moodboard', 'lighting'])
        self.assertNotIn('z', result['boards'][0]['items'][0], 'moodboard items stay free of spatial fields')
        self.assertTrue(all('z' in item for item in result['boards'][1]['items']))
        self.assertEqual(self.put([mood, light])['revision'], self.revision)
        self.assertEqual(self.request(self.path)[1]['boards'], result['boards'])

    def test_moodboard_empty_rename_resize_and_revision_round_trip(self):
        empty = _board('mood-empty', 'moodboard', [])
        first = self.put([empty])
        self.assertEqual(first['revision'], 1)
        self.assertEqual(first['boards'], [empty])
        renamed = {**empty, 'name': 'Moodboard renamed', 'width': 1800, 'height': 1200}
        second = self.put([renamed])
        self.assertEqual(second['revision'], 2)
        self.assertEqual(self.request(self.path)[1], second)

    def test_moodboard_note_color_link_image_whitelist_round_trip(self):
        asset_id = str(uuid.uuid4())
        with self.app.connect() as db:
            db.execute("""INSERT INTO assets
                (id, project_id, filename, stored_name, mime, size, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (asset_id, self.pid, 'reference.png', asset_id + '.png', 'image/png', 68, '2026-09-23T00:00:00Z'))
        mood = _board('mood-types', 'moodboard', [
            _item('note', 'note', text='Visual direction', color='#fff2b3'),
            _item('color', 'color', color='#64748b'),
            _item('link', 'link', url='https://example.com/reference'),
            _item('image', 'image', asset_id=asset_id),
        ])
        result = self.put([mood])
        self.assertEqual([item['type'] for item in result['boards'][0]['items']], ['note', 'color', 'link', 'image'])
        self.assertEqual(result['boards'][0]['items'][3]['asset_id'], asset_id)
        self.assertEqual(self.request(self.path)[1]['boards'], result['boards'])

    def test_moodboard_rejects_unknown_fields_and_stale_revision(self):
        bad = _board('mood-bad', 'moodboard', [_item('note', 'note', text='hi', runtime_only=True)])
        self.assertEqual(self.request(self.path, 'PUT', {'revision': 0, 'boards': [bad]})[0], 400)
        valid = _board('mood-good', 'moodboard', [_item('note', 'note', text='hi')])
        saved = self.put([valid])
        self.assertEqual(saved['revision'], 1)
        status, result = self.request(self.path, 'PUT', {'revision': 0, 'boards': [valid]})
        self.assertEqual(status, 409)
        self.assertIn('error', result)
        self.assertEqual(self.request(self.path)[1]['boards'], saved['boards'])

    # -- backup import validates the same contract ----------------------------

    def test_backup_import_validates_boards(self):
        self.put([_board('lite', 'lighting', [_item('key', 'light', z=180)])], expect=200)
        # Plain open/close: sqlite3's context manager would already hold a
        # transaction and import_project_backup issues its own BEGIN IMMEDIATE.
        db = self.app.connect()
        try:
            backup = self.app.export_project_backup(db, self.pid)
            db.commit()  # clear the implicit read transaction before BEGIN IMMEDIATE
            pid = self.app.import_project_backup(db, json.loads(json.dumps(backup)),
                                                 {'user_id': 'qa', 'username': 'qa', 'display_name': 'qa'})
            row = db.execute('SELECT data_json FROM project_creative_boards WHERE project_id=?', (pid,)).fetchone()
        finally:
            db.close()
        self.assertEqual(json.loads(row[0])[0]['items'][0]['z'], 180, 'z survives a backup round trip')

        bad = json.loads(json.dumps(backup))
        boards = json.loads(bad['_backup']['tables']['project_creative_boards'][0]['data_json'])
        boards[0]['kind'] = 'moodboard'
        boards[0]['items'][0] = _item('n', 'note', text='x', z=5)
        bad['_backup']['tables']['project_creative_boards'][0]['data_json'] = json.dumps(boards)
        db = self.app.connect()
        try:
            with self.assertRaises(ValueError):
                self.app.import_project_backup(db, bad, {'user_id': 'qa', 'username': 'qa', 'display_name': 'qa'})
        finally:
            db.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
