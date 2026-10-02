// node tests/frontend/shot-column-sort.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/shot-table-presentation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { module: mod, exports: mod.exports });
const { compareShotColumnValues: compare, normalizeShotTablePresentationPreferences: normalize } = mod.exports;
assert.deepEqual([100, null, 2, 10].sort((a,b) => compare(a,b,'number','asc')), [2,10,100,null]);
assert.deepEqual(['三字文', '', '字', '双字'].sort((a,b) => compare(a,b,'text','desc')), ['三字文','双字','字','']);
assert.equal(compare('😀', '中', 'text', 'asc'), 0);
assert.deepEqual(['张', '白', '陈'].sort((a,b) => compare(a,b,'select','asc')), ['白','陈','张']);
assert.equal(compare('摄影', '实拍', 'select', 'asc'), 0);
assert.deepEqual(['stock','AE','archive'].sort((a,b) => compare(a,b,'select','asc')), ['AE','archive','stock']);
const layout = normalize({ columnOrder: ['tc_in','panel_frame','original_number'], displayOrder: ['panel_frame','custom:take','name'],
  hiddenColumns: ['original_description'], columnWidths: { 'custom:take': 800 }, columnLabels: { movement_reference: '旧名', name: '标题' } });
assert(!layout.columnOrder.includes('panel_frame'));
assert(!layout.columnOrder.includes('original_number'));
assert.deepEqual(Array.from(layout.displayOrder), ['custom:take','name']);
assert.equal(layout.columnWidths['custom:take'], 560);
assert.equal(layout.columnLabels.name, '标题');
assert(!layout.columnLabels.movement_reference);
console.log('Column numeric/text/pinyin ordering, empty values and retired-column layout checks passed.');
