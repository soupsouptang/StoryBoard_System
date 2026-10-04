from html.parser import HTMLParser
from pathlib import Path
import unittest


class WorkspaceMarkupTest(unittest.TestCase):
    def test_dialog_names_and_close_controls(self):
        class Parser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids = set()
                self.titles = []
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if attrs.get('id'):
                    self.ids.add(attrs['id'])
                if tag == 'dialog':
                    assert attrs.get('aria-labelledby'), attrs.get('id')
                    self.titles.append(attrs['aria-labelledby'])
                if tag == 'button' and attrs.get('data-close'):
                    assert attrs.get('aria-label'), attrs['data-close']
        parser = Parser()
        parser.feed((Path(__file__).parents[1] / 'static/index.html').read_text(encoding='utf-8'))
        self.assertGreater(len(parser.titles), 10)
        for title in parser.titles:
            self.assertIn(title, parser.ids)

    def test_workspace_hierarchy_and_unique_ids(self):
        class Parser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.stack = []
                self.paths = {}
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                key = attrs.get('id') or attrs.get('class') or tag
                if attrs.get('id'):
                    if attrs['id'] in self.paths:
                        raise AssertionError('Duplicate id: ' + attrs['id'])
                    self.paths[attrs['id']] = [entry[1] for entry in self.stack]
                if tag not in {'input', 'meta', 'link', 'img', 'br', 'hr', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'track'}:
                    self.stack.append((tag, key))
            def handle_endtag(self, tag):
                for index in range(len(self.stack)-1, -1, -1):
                    if self.stack[index][0] == tag:
                        self.stack = self.stack[:index]
                        break
        parser = Parser()
        parser.feed((Path(__file__).parents[1] / 'static/index.html').read_text(encoding='utf-8'))
        for key in ('workspaceViewTabs', 'filterPopoverBtn', 'addShotActionBtn', 'columnSettingsBtn'):
            self.assertIn('workspace-toolbar', parser.paths[key], key)
        for key in ('undoBtn', 'redoBtn', 'importExcelBtn', 'pdfExportQuickBtn'):
            self.assertIn('project-context-header', parser.paths[key], key)
            self.assertNotIn('workspace-toolbar', parser.paths[key], key)
        self.assertIn('toolbarSecondaryActions', parser.paths['rowHeightSelect'])
