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
assert.equal(layout.columnLabels.name, undefined, 'Original system column names cannot be replaced by saved layouts');
assert.equal(normalize({columnLabels:{'custom:title': '镜头标题'}}).columnLabels['custom:title'], '镜头标题');
assert(!layout.columnLabels.movement_reference);
console.log('Column numeric/text/pinyin ordering, empty values and retired-column layout checks passed.');

const { shotTableTextLines: lines } = mod.exports;
assert.equal(lines('字'.repeat(18))[0], '字'.repeat(18));
assert.equal(lines('字'.repeat(19))[0], '字'.repeat(17) + '...');
assert.deepEqual(Array.from(lines('字'.repeat(37), 2)), ['字'.repeat(18), '字'.repeat(17) + '...']);
assert.equal(lines('👨‍👩‍👧‍👦'.repeat(19))[0], '👨‍👩‍👧‍👦'.repeat(17) + '...');
assert.deepEqual(Array.from(lines('ABCDEFGHIJKLMN', 2, 8, value => value.length)), ['ABCDEFGH', 'IJKLMN']);
assert.equal(lines('ABCDEFGHIJKLMN', 1, 8, value => value.length)[0], 'ABCDE...');
assert.deepEqual(Array.from(lines('第一行\n第二行', 2)), ['第一行','第二行']);
assert.deepEqual(Array.from(lines('字'.repeat(18) + '，后文', 2)), ['字'.repeat(17), '字，后文']);
assert.deepEqual(Array.from(lines('ABCDE，。FG', 3, 5, value => value.length)), ['ABCD','E，。FG']);
assert.deepEqual(Array.from(lines('第一行\n，第二行', 2)), ['第一行，第二行']);
assert.deepEqual(Array.from(lines('ABCD ，后文', 3, 4, value => value.length)), ['ABC','D ，后','文']);
assert.equal(lines('字' + '，'.repeat(20), 3, 18, value => value.length)[0], '字...');
assert.equal(lines('字'.repeat(18) + '\n')[0], '字'.repeat(18));
console.log('18 graphemes, literal dots, multiline and narrow-width display checks passed.');
