"""Field commands exercised through HTTP against an isolated temporary database."""
import unittest
import urllib.error

import sys
from pathlib import Path

_tests_dir = str(Path(__file__).resolve().parent)
if _tests_dir not in sys.path:
    sys.path.insert(0, _tests_dir)

import test_v62_editor_actions as harness


class FieldLifecycleContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        harness.V62EditorActionsTest.setUpClass()

    @classmethod
    def tearDownClass(cls):
        harness.V62EditorActionsTest.tearDownClass()

    def setUp(self):
        _, bundle = harness.V62EditorActionsTest.request('/api/projects', 'POST', {'name': 'Field lifecycle contract'}, harness.V62EditorActionsTest.csrf)
        self.pid = bundle['project']['id']
        self.path = f'/api/projects/{self.pid}'

    def request(self, suffix='', method='GET', data=None):
        return harness.V62EditorActionsTest.request(self.path + suffix, method, data, harness.V62EditorActionsTest.csrf)[1]

    def reject(self, suffix, method, data, status):
        with self.assertRaises(urllib.error.HTTPError) as caught:
            self.request(suffix, method, data)
        self.assertEqual(caught.exception.code, status)

    def archive_purge(self, key):
        self.request('/column-preferences', 'PUT', {'preferences': [{'column_key': key, 'state': 'removed'}]})
        return self.request('/columns/purge', 'DELETE', {'fields': [key]})

    def test_tombstones_require_purge_and_stale_preferences_cannot_restore(self):
        self.reject('/column-preferences', 'PUT', {'preferences': [
            {'column_key': 'title', 'state': 'removed'},
            {'column_key': 'description', 'state': 'removed', 'permanently_deleted': 1},
        ]}, 400)
        self.assertEqual(self.request('/column-preferences'), [])
        before = self.request()
        with harness.V62EditorActionsTest.app.connect() as db:
            snapshots = {r['id']: r['snapshot_json'] for r in db.execute(
                'SELECT id,snapshot_json FROM project_snapshots WHERE project_id=?', (self.pid,))}
        purged = self.archive_purge('description')
        self.assertTrue(all(not shot['description'] for shot in purged['bundle']['shots']))
        self.assertEqual(len(purged['bundle']['shots']), len(before['shots']))
        prefs = self.request('/column-preferences', 'PUT', {'preferences': [
            {'column_key': 'description', 'state': 'visible', 'permanently_deleted': 0}]})
        self.assertEqual((prefs[0]['state'], prefs[0]['permanently_deleted']), ('removed', 1))
        with harness.V62EditorActionsTest.app.connect() as db:
            for row in db.execute('SELECT id,snapshot_json FROM project_snapshots WHERE project_id=?', (self.pid,)):
                if row['id'] in snapshots:
                    self.assertEqual(row['snapshot_json'], snapshots[row['id']])
        self.reject('/import-commit', 'POST', {
            'headers': ['描述'], 'rows': [['旧内容']], 'mapping': {'description': {'col': 0}}, 'mode': 'replace'}, 409)
        self.assertEqual(self.request()['shots'], purged['bundle']['shots'])

    def test_custom_field_identity_cannot_be_recreated_by_import_or_create(self):
        self.request('/custom-fields', 'POST', {'key': 'client_note', 'label': '客户备注'})
        self.archive_purge('custom:client_note')
        self.reject('/custom-fields', 'POST', {'key': 'client_note', 'label': '客户备注'}, 409)
        self.reject('/import-commit', 'POST', {
            'headers': ['新增字段', '客户备注'], 'rows': [['must roll back', 'old']], 'mapping': {},
            'custom_columns': [{'source_col': 0, 'key': 'new_before_rejection'}, {'source_col': 1, 'key': 'client_note'}],
        }, 409)
        self.assertFalse(self.request()['custom_fields'])
        self.request('/custom-fields', 'POST', {'key': 'client_note_v2', 'label': '新备注'})
        self.assertEqual(self.request()['custom_fields'][0]['key'], 'client_note_v2')

    def test_raw_import_tombstone_blocks_replace_without_partial_write(self):
        payload = {'headers': ['素材备注'], 'rows': [['original']], 'mapping': {},
                   'custom_columns': [{'source_col': 0, 'key': 'asset_note'}]}
        self.request('/import-commit', 'POST', payload)
        before = self.archive_purge('import:素材备注')['bundle']
        self.reject('/import-commit', 'POST', {**payload, 'mode': 'replace'}, 409)
        self.assertEqual(self.request()['shots'], before['shots'])

    def test_import_suffix_skips_purged_custom_key(self):
        old = self.request('/custom-fields', 'POST', {'key': 'archive_base', 'label': '旧列'})
        self.request(f"/custom-fields/{old['id']}", 'DELETE')
        self.request('/custom-fields', 'POST', {'key': 'archive_base_2', 'label': '后缀列'})
        self.archive_purge('custom:archive_base_2')
        imported = self.request('/import-commit', 'POST', {
            'headers': ['新列'], 'rows': [['kept']], 'mapping': {},
            'custom_columns': [{'source_col': 0, 'key': 'archive_base'}],
        })
        self.assertEqual(imported['bundle']['custom_fields'][0]['key'], 'archive_base_3')
        self.assertTrue(all(field['key'] != 'archive_base_2' for field in imported['bundle']['custom_fields']))


if __name__ == '__main__':
    unittest.main()
