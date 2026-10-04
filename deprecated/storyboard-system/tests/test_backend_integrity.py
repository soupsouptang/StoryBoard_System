"""Backend regression tests using an isolated database and real HTTP requests."""
import base64
import concurrent.futures
import hashlib
import http.cookiejar
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import types
import unittest
import urllib.error
import urllib.request
import uuid
import zipfile
from unittest.mock import patch


PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8S8AAAAASUVORK5CYII=')


class BackendIntegrityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        cls.env = patch.dict(os.environ, STORYBOARD_DATA_ROOT=cls.temp.name,
                             STORYBOARD_ADMIN_USER='integrity-admin', STORYBOARD_ADMIN_PASSWORD='Integrity2026!')
        cls.env.start()
        spec = importlib.util.spec_from_file_location('integrity_app', Path(__file__).parents[1] / 'server.py')
        cls.app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.app)
        cls.app.init_db()
        cls.app.AppHandler.log_message = lambda *args: None
        cls.httpd = cls.app.ThreadingHTTPServer(('127.0.0.1', 0), cls.app.AppHandler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.httpd.server_port}'
        cls.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status, cls.session = cls.request('/api/login', 'POST', {'username': 'integrity-admin', 'password': 'Integrity2026!'})
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

    def project(self):
        status, bundle = self.request('/api/projects', 'POST', {'name': 'Integrity ' + uuid.uuid4().hex[:8]})
        self.assertEqual(status, 201, bundle)
        self.assertTrue(bundle['shots'])
        return bundle

    def upload(self, bundle, old=None):
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        status, media = self.request(f'/api/projects/{pid}/media?shot_id={sid}&filename=one.png' + (f'&asset_id={old}' if old else ''), 'POST', PNG, 'image/png')
        self.assertEqual(status, 201, media)
        return media

    def test_creative_boards_routes_conflicts_backup_and_media_retention(self):
        bundle = self.project()
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        media = self.upload(bundle)
        path = f'/api/projects/{pid}/creative-boards'
        self.assertEqual(self.request(path), (200, {'revision': 0, 'boards': []}))
        boards = [{'id': 'mood', 'kind': 'moodboard', 'name': 'Reference', 'width': 1600, 'height': 1000,
                   'shot_ids': [sid], 'items': [{'id': 'image', 'type': 'image', 'x': 20, 'y': 20,
                                              'width': 240, 'height': 180, 'asset_id': media['id']}]},
                  {'id': 'light-board', 'kind': 'lighting', 'name': 'Lighting', 'shot_ids': [sid],
                   'items': [{'id': 'key', 'type': 'light', 'x': 80, 'y': 80, 'width': 100, 'height': 100,
                              'rotation': 45, 'attachment': 'grid'}]}]
        status, result = self.request(path, 'PUT', {'revision': 0, 'boards': boards})
        self.assertEqual(status, 200, result)
        self.assertEqual(result['boards'][1]['items'][0]['beam_spread'], 40)
        self.assertEqual(self.request(path)[1], result)
        self.assertEqual(self.request(path, 'PUT', {'revision': 0, 'boards': []})[0], 409)
        invalid = json.loads(json.dumps(boards))
        invalid[0]['items'][0]['asset_id'] = 'other-project-media'
        self.assertEqual(self.request(path, 'PUT', {'revision': 1, 'boards': invalid})[0], 400)
        self.assertEqual(self.request(path)[1], result)
        with self.app.connect() as db:
            backup = self.app.export_project_backup(db, pid)
        self.assertEqual(len(backup['_backup']['tables']['project_creative_boards']), 1)
        with self.app.connect() as db:
            self.app.purge_shot_records(db, [sid])
            self.assertIsNotNone(db.execute('SELECT id FROM assets WHERE id=?', (media['id'],)).fetchone())
        after = self.request(path)[1]
        self.assertEqual(after['revision'], 2)
        self.assertEqual(after['boards'][0]['shot_ids'], [])
        self.assertEqual(self.request(path, 'PUT', {'revision': 2, 'boards': after['boards']})[0], 200)

    def test_structured_rich_text_persists_and_stale_marks_never_override_text(self):
        bundle = self.project()
        pid, shot = bundle['project']['id'], bundle['shots'][0]
        plain = '<img onerror=alert(1)> safe'
        payload = {'id': shot['id'], 'base_revision': shot['revision'],
                   'changed_fields': ['description', 'rich_text_json', 'script_character'],
                   'description': plain, 'script_character': 'ALEX',
                   'rich_text_json': {'description': [{'text': plain, 'bold': True, 'size': 18, 'highlight': 'yellow', 'html': '<script>'}]}}
        status, result = self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [payload]})
        self.assertEqual(status, 200, result)
        current = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        self.assertEqual(current['description'], plain)
        self.assertEqual(current['script_character'], 'ALEX')
        self.assertNotIn('html', current['rich_text_json']['description'][0])
        shared = self.app.compact_share_bundle({'project': bundle['project'], 'shots': [current]}, ['description'])
        self.assertTrue(shared['shots'][0]['rich_text_json']['description'][0]['bold'])
        self.assertNotIn('script_character', shared['shots'][0])
        current['description'] = 'new plain text'
        self.assertEqual(self.app.normalize_rich_text(current['rich_text_json'], current), {})

    def test_concurrent_same_field_conflicts_and_disjoint_fields_merge(self):
        bundle = self.project()
        pid, shot = bundle['project']['id'], bundle['shots'][0]
        barrier = threading.Barrier(2)
        def save(field, value):
            barrier.wait()
            return self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [{'id': shot['id'], 'base_revision': shot['revision'], 'changed_fields': [field], field: value}]})[0]
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            futures = [pool.submit(save, 'title', value) for value in ('first', 'second')]
            self.assertEqual(sorted(f.result() for f in futures), [200, 409])
        shot = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        before = self.request(f'/api/projects/{pid}/sync-state')[1]['updated_at']
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            futures = [pool.submit(save, field, field + '-saved') for field in ('description', 'voiceover')]
            self.assertEqual([f.result() for f in futures], [200, 200])
        actual = self.request(f'/api/projects/{pid}')[1]
        self.assertEqual(actual['shots'][0]['description'], 'description-saved')
        self.assertEqual(actual['shots'][0]['voiceover'], 'voiceover-saved')
        self.assertNotEqual(before, actual['project']['updated_at'])
        self.assertEqual(actual['shots'][0]['revision'], shot['revision'] + 2)

    def test_immediate_create_read_is_committed(self):
        bundle = self.project()
        pid = bundle['project']['id']
        for index in range(8):
            status, created = self.request(f'/api/projects/{pid}/shots', 'POST', {'title': f'Immediate {index}'})
            self.assertEqual(status, 201)
            fresh = self.request(f'/api/projects/{pid}')[1]
            self.assertEqual({s['id'] for s in created['shots']}, {s['id'] for s in fresh['shots']})

    def test_immutable_media_panel_undo_and_scope(self):
        bundle = self.project()
        first = self.upload(bundle)
        self.assertEqual(first['panel']['media_id'], first['id'])
        second = self.upload(bundle, first['id'])
        self.assertEqual(second['panel']['id'], first['panel']['id'])
        self.assertNotEqual(first['id'], second['id'])
        pid = bundle['project']['id']
        shot = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        self.assertEqual(shot['panels'][0]['media_id'], second['id'])
        patch_body = {'shots': [{'id': shot['id'], 'changed_fields': ['panels'], 'panels': [{**shot['panels'][0], 'media_id': first['id']}]}]}
        self.assertEqual(self.request(f'/api/projects/{pid}/shots', 'PUT', patch_body)[0], 200)
        actual = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        self.assertEqual(actual['panels'][0]['media_id'], first['id'])
        self.assertEqual(self.request(f"/media/{first['id']}")[1], PNG)
        self.assertEqual(self.request(f"/media/{second['id']}")[1], PNG)
        other = self.project()
        alien = self.upload(other)
        patch_body['shots'][0]['panels'][0]['media_id'] = alien['id']
        self.assertEqual(self.request(f'/api/projects/{pid}/shots', 'PUT', patch_body)[0], 400)
        self.assertEqual(self.request(f'/api/projects/{pid}')[1]['shots'][0]['panels'][0]['media_id'], first['id'])

    def test_version_restore_restores_panel_image(self):
        bundle = self.project()
        first = self.upload(bundle)
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        status, version = self.request(f'/api/shots/{sid}/versions', 'POST', {'name': 'before replacement'})
        self.assertEqual(status, 201, version)
        second = self.upload(bundle, first['id'])
        self.assertEqual(self.request(f'/api/projects/{pid}')[1]['shots'][0]['panels'][0]['media_id'], second['id'])
        status, restored = self.request(f"/api/versions/{version['id']}/restore", 'POST', {})
        self.assertEqual(status, 200, restored)
        actual = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        self.assertEqual(actual['panels'][0]['media_id'], first['id'])
        self.assertEqual(self.request(f"/media/{first['id']}")[1], PNG)

    def test_paste_cross_project_and_cut_failure_atomicity(self):
        source, target = self.project(), self.project()
        media = self.upload(source)
        pid, sid, tid = source['project']['id'], source['shots'][0]['id'], target['project']['id']
        status, field = self.request(f'/api/projects/{pid}/custom-fields', 'POST', {'key': 'copy_note', 'label': 'Copy Note', 'field_type': 'text'})
        self.assertEqual(status, 201, field)
        self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [{'id': sid, 'changed_fields': ['dialogue', 'custom_fields'], 'dialogue': 'business-data', 'custom_fields': {'copy_note': 'retained'}}]})
        self.request(f'/api/shots/{sid}/production-steps', 'POST', {'name': 'Step', 'input_asset': media['id']})
        payload = {'source_project_id': pid, 'source_ids': [sid], 'mode': 'copy', 'position': 1, 'shots': []}
        status, copied = self.request(f'/api/projects/{tid}/shots/paste', 'POST', payload)
        self.assertEqual(status, 201, copied)
        actual = copied['shots'][1]
        self.assertEqual(actual['id'], copied['pasted_shot_ids'][0])
        self.assertEqual(actual['dialogue'], 'business-data')
        self.assertEqual(actual['custom_fields']['copy_note'], 'retained')
        new_media = actual['panels'][0]['media_id']
        self.assertNotEqual(new_media, media['id'])
        self.assertEqual(actual['steps'][0]['input_asset'], new_media)
        self.assertEqual(self.request(f'/media/{new_media}')[1], PNG)
        with self.app.connect() as db:
            self.assertEqual(db.execute('SELECT project_id FROM assets WHERE id=?', (new_media,)).fetchone()[0], tid)
        before = {p.name for p in self.app.MEDIA_ROOT.iterdir()}
        payload.update(mode='cut', source_ids=[sid, 'missing'])
        self.assertEqual(self.request(f'/api/projects/{tid}/shots/paste', 'POST', payload)[0], 400)
        self.assertEqual(before, {p.name for p in self.app.MEDIA_ROOT.iterdir()})
        self.assertIn(sid, [s['id'] for s in self.request(f'/api/projects/{pid}')[1]['shots']])
        payload['source_ids'] = [sid]
        status, cut = self.request(f'/api/projects/{tid}/shots/paste', 'POST', payload)
        self.assertEqual(status, 201, cut)
        self.assertNotIn(sid, [s['id'] for s in self.request(f'/api/projects/{pid}')[1]['shots']])
        self.assertEqual(self.request(f"/media/{media['id']}")[1], PNG)

    def test_avatar_version_identical_in_session_and_presence(self):
        status, first = self.request('/api/profile/avatar', 'POST', PNG, 'image/png')
        self.assertEqual(status, 200)
        bundle = self.project()
        def heartbeat():
            status, result = self.request('/api/v1/presence/heartbeat', 'POST', {'production_id': bundle['project']['id']})
            self.assertEqual(status, 200)
            return next(p for p in result['presence'] if p['user_id'] == self.session['user_id'])
        self.assertEqual(heartbeat()['avatar_url'], first['avatar_url'])
        self.assertIn('?v=', first['avatar_url'])
        second = self.request('/api/profile/avatar', 'POST', PNG, 'image/png')[1]
        self.assertNotEqual(second['avatar_url'], first['avatar_url'])
        self.assertEqual(heartbeat()['avatar_url'], second['avatar_url'])
        self.assertEqual(self.request(second['avatar_url'])[1], PNG)

    def test_rename_does_not_reassign_legacy_or_same_name_comments(self):
        bundle = self.project()
        sid = bundle['shots'][0]['id']
        self.request('/api/profile', 'PUT', {'display_name': 'Same Name'})
        own = self.request(f'/api/shots/{sid}/comments', 'POST', {'text': 'own'})[1]
        foreign = str(uuid.uuid4())
        with self.app.connect() as db:
            self.app.insert_record(db, 'comments', {'id': foreign, 'shot_id': sid, 'author_name': 'Same Name', 'text': 'legacy', 'created_at': self.app.now_iso()})
        self.assertEqual(self.request('/api/profile', 'PUT', {'display_name': 'Changed Name'})[0], 200)
        with self.app.connect() as db:
            self.assertEqual(db.execute('SELECT author_name FROM comments WHERE id=?', (foreign,)).fetchone()[0], 'Same Name')
            self.assertEqual(db.execute('SELECT author_name FROM comments WHERE id=?', (own['id'],)).fetchone()[0], 'Changed Name')

    def test_snapshot_does_not_recursively_embed_history(self):
        bundle = self.project()
        sid = bundle['shots'][0]['id']
        sizes = []
        with self.app.connect() as db:
            for i in range(12):
                snapshot, _ = self.app.complete_shot_snapshot(db, sid, self.app.project_bundle)
                self.assertNotIn('versions', snapshot)
                self.assertNotIn('review_history', snapshot)
                sizes.append(len(json.dumps(snapshot)))
                self.app.insert_record(db, 'shot_versions', {'id': str(uuid.uuid4()), 'shot_id': sid, 'version_num': f'v{i:03d}', 'snapshot_json': json.dumps(snapshot), 'created_at': self.app.now_iso(), 'updated_at': self.app.now_iso()})
        self.assertLess(max(sizes) - min(sizes), 100)

    def test_share_download_respects_visible_columns(self):
        bundle = self.project()
        media = self.upload(bundle)
        pid = bundle['project']['id']
        status, share = self.request(f'/api/projects/{pid}/share', 'POST', {'view_config': {'visible_columns': ['title']}})
        self.assertEqual(status, 200, share)
        exposed = self.request(f"/api/shares/{share['token']}")[1]['bundle']
        for shot in exposed['shots']:
            self.assertEqual(set(shot), {'id', 'title', 'custom_fields'})
        status, raw = self.request(f"/api/shares/{share['token']}/download")
        self.assertEqual(status, 200, raw)
        with self.assertRaises(urllib.error.HTTPError) as rejected:
            urllib.request.urlopen(self.base + f"/media/{media['id']}?share={share['token']}")
        self.assertEqual(rejected.exception.code, 403)
        rejected.exception.close()
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            csv_name = next(n for n in archive.namelist() if n.endswith('.csv'))
            self.assertEqual(archive.read(csv_name).decode('utf-8-sig').splitlines()[0], '标题')
            self.assertFalse(any(n.endswith(('.png', '.edl', '.srt')) for n in archive.namelist()))

    def test_full_backup_roundtrip_media_business_fields_and_history(self):
        bundle = self.project()
        self.upload(bundle)
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [{'id': sid, 'changed_fields': ['dialogue', 'locked', 'lens'], 'dialogue': 'keep', 'locked': True, 'lens': '85mm'}]})
        self.request(f'/api/shots/{sid}/comments', 'POST', {'text': 'keep comment'})
        self.request(f'/api/shots/{sid}/versions', 'POST', {'name': 'preserved version'})
        self.request(f'/api/shots/{sid}/production-steps', 'POST', {'name': 'preserved step'})
        status, backup = self.request(f'/api/projects/{pid}/export/json')
        self.assertEqual(status, 200, backup)
        self.assertEqual(backup['_backup']['version'], 2)
        status, restored = self.request('/api/projects/import-backup', 'POST', backup)
        self.assertEqual(status, 201, restored)
        self.assertNotEqual(restored['project']['id'], pid)
        shot = restored['shots'][0]
        self.assertEqual((shot['dialogue'], shot['locked'], shot['lens']), ('keep', True, '85mm'))
        self.assertEqual(shot['comments'][0]['text'], 'keep comment')
        self.assertEqual(shot['steps'][0]['name'], 'preserved step')
        self.assertEqual(shot['versions'][0]['name'], 'preserved version')
        version_snapshot = json.loads(shot['versions'][0]['snapshot_json'])
        self.assertEqual(version_snapshot['id'], shot['id'])
        self.assertEqual(version_snapshot['panels'][0]['media_id'], shot['panels'][0]['media_id'])
        self.assertEqual(self.request(f"/media/{shot['panels'][0]['media_id']}")[1], PNG)
        self.assertNotEqual(shot['panels'][0]['media_id'], backup['shots'][0]['panels'][0]['media_id'])
        with self.app.connect() as db:
            self.assertFalse(db.execute('PRAGMA foreign_key_check').fetchall())
        one = next(iter(backup['_backup']['files'].values()))
        one['sha256'] = 'bad'
        count = len(self.request('/api/projects')[1])
        self.assertEqual(self.request('/api/projects/import-backup', 'POST', backup)[0], 400)
        self.assertEqual(len(self.request('/api/projects')[1]), count)

    def test_trash_maintenance_keeps_snapshot_and_panel_references(self):
        bundle = self.project()
        media = self.upload(bundle)
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        # A historical project snapshot independently retains this image.
        self.request(f'/api/projects/{pid}/shots', 'PUT', {'shots': [{'id': sid, 'changed_fields': ['title'], 'title': 'snapshot holder'}]})
        with self.app.connect() as db:
            db.execute("UPDATE shots SET is_deleted=1,deleted_at='2000-01-01T00:00:00+00:00' WHERE id=?", (sid,))
        self.app.run_trash_maintenance()
        with self.app.connect() as db:
            self.assertIsNone(db.execute('SELECT id FROM shots WHERE id=?', (sid,)).fetchone())
            self.assertIsNotNone(db.execute('SELECT id FROM assets WHERE id=?', (media['id'],)).fetchone())
        self.assertEqual(self.request(f"/media/{media['id']}")[1], PNG)

    def test_paste_filesystem_failure_rolls_back_cut(self):
        source, target = self.project(), self.project()
        self.upload(source)
        second = {**source, 'shots': [source['shots'][1]]}
        missing = self.upload(second)
        with self.app.connect() as db:
            filename = db.execute('SELECT stored_name FROM assets WHERE id=?', (missing['id'],)).fetchone()[0]
        (self.app.MEDIA_ROOT / filename).unlink()
        before_files = set(self.app.MEDIA_ROOT.iterdir())
        tid, pid = target['project']['id'], source['project']['id']
        ids = [s['id'] for s in source['shots'][:2]]
        status, result = self.request(f'/api/projects/{tid}/shots/paste', 'POST', {'source_project_id': pid, 'source_ids': ids, 'mode': 'cut', 'position': 0})
        self.assertEqual(status, 400, result)
        self.assertEqual(set(self.app.MEDIA_ROOT.iterdir()), before_files)
        self.assertEqual(len(self.request(f'/api/projects/{tid}')[1]['shots']), len(target['shots']))
        self.assertTrue(set(ids) <= {s['id'] for s in self.request(f'/api/projects/{pid}')[1]['shots']})

    def test_pdf_mapping_and_multiple_panels(self):
        # Controlled PDF-reader fixtures exercise mapping, not visual appearance.
        page = types.SimpleNamespace(extract_text=lambda **kwargs: '#001\n中全景\n#002\n大特写',
                                     images=[types.SimpleNamespace(name='SHOT002.png', data=PNG + b'0'*4096),
                                             types.SimpleNamespace(name='SHOT001.png', data=PNG + b'1'*4096)])
        fake_reader = types.SimpleNamespace(is_encrypted=False, pages=[page])
        with patch.dict('sys.modules', {'pypdf': types.SimpleNamespace(PdfReader=lambda _: fake_reader)}):
            rows, images = self.app.parse_pdf_storyboard(Path('fixture.pdf'))
            self.assertEqual([row[2] for row in rows[1:]], ['中全景', '大特写'])
            self.assertEqual([image['data_row'] for image in images], [2, 1])
            page.images[0].name = 'ambiguous.png'
            with self.assertRaisesRegex(ValueError, '无法可靠定位'):
                self.app.parse_pdf_storyboard(Path('fixture.pdf'))
        bundle = self.project()
        pid, sid = bundle['project']['id'], bundle['shots'][0]['id']
        handler = object.__new__(self.app.AppHandler)
        with self.app.connect() as db:
            for index in range(2):
                self.assertTrue(handler.store_import_image(db, self.session, pid, sid, {'mime': 'image/png', 'raw': PNG, 'filename': f'import-{index}.png'}, self.app.now_iso()))
        actual = self.request(f'/api/projects/{pid}')[1]['shots'][0]
        panels = [p for p in actual['panels'] if p['media_id']]
        self.assertEqual(len(panels), 2)
        self.assertEqual(len({p['media_id'] for p in panels}), 2)
        for panel in panels:
            self.assertEqual(self.request(f"/media/{panel['media_id']}")[1], PNG)

    def test_image_only_pdf_preview_warns_and_keeps_page_import_available(self):
        page = types.SimpleNamespace(extract_text=lambda **kwargs: '',
                                     images=[types.SimpleNamespace(name='page.png', data=PNG)])
        fake_reader = types.SimpleNamespace(is_encrypted=False, pages=[page])
        bundle = self.project()
        pid = bundle['project']['id']
        with patch.dict('sys.modules', {'pypdf': types.SimpleNamespace(PdfReader=lambda _: fake_reader)}):
            status, preview = self.request(f'/api/projects/{pid}/import-preview?filename=image-only.pdf',
                                           'POST', b'%PDF-image-only-test', 'application/pdf')
        self.assertEqual(status, 200, preview)
        self.assertEqual(preview['total_rows'], 1)
        self.assertEqual(set(preview['mapping']), {'number', 'title'})
        self.assertEqual(preview['custom_columns'], [])
        self.assertEqual(preview['embedded_image_count'], 1)
        self.assertEqual(preview['source_diagnostics'][0]['code'], 'pdf_text_not_extracted')
        self.assertEqual(preview['source_diagnostics'][0]['page_count'], 1)
        self.assertEqual(preview['source_diagnostics'][0]['text_page_count'], 0)
        self.assertIn('OCR', preview['source_diagnostics'][0]['message'])
        status, result = self.request(f'/api/projects/{pid}/import-commit', 'POST', {
            'preview_id': preview['preview_id'], 'mapping': preview['mapping'], 'mode': 'replace',
        })
        self.assertEqual(status, 200, result)
        self.assertEqual(result['imported'], 1)
        self.assertEqual(result['images_imported'], 1)
        self.assertEqual(result['bundle']['shots'][0]['number'], '001')
        self.assertEqual(result['bundle']['shots'][0]['title'], 'PDF 第 1 页')

    def test_image_only_pdf_prefers_whole_page_render_over_embedded_images(self):
        page = types.SimpleNamespace(extract_text=lambda **kwargs: '',
                                     images=[types.SimpleNamespace(name='embedded.png', data=PNG)])
        fake_reader = types.SimpleNamespace(is_encrypted=False, pages=[page])

        def render_page(args, **kwargs):
            Path(args[-1] + '.jpg').write_bytes(b'whole-page-render')

        with patch.dict('sys.modules', {'pypdf': types.SimpleNamespace(PdfReader=lambda _: fake_reader)}), \
             patch('import_parsing.shutil.which', return_value='pdftoppm'), \
             patch('import_parsing.subprocess.run', side_effect=render_page):
            rows, images, metadata = self.app.parse_pdf_storyboard(Path('fixture.pdf'), with_metadata=True)
        self.assertEqual(len(rows), 2)
        self.assertEqual(metadata, {'page_count': 1, 'text_page_count': 0, 'rendered_page_count': 1})
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]['filename'], 'page-1.jpg')
        self.assertEqual(images[0]['raw'], b'whole-page-render')


if __name__ == '__main__':
    unittest.main()
