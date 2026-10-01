// Run: node tests/frontend/shot-methods.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/shot-display.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { module: moduleObject, exports: moduleObject.exports });
const { shotMethodValues, groupShotsByMethod } = moduleObject.exports;
const shots = [
  { id: 'A', primary_method: 'live', secondary_methods: ['ae', 'ae', 'live'] },
  { id: 'B', primary_method: 'stock', secondary_methods: ['vfx'] },
  { id: 'C', primary_method: 'ae', secondary_methods: ['vfx'] }
];
const groups = groupShotsByMethod(shots);
assert.equal(JSON.stringify(shotMethodValues(shots[0])), '["live","ae"]');
assert.equal(groups.get('ae').length, 2);
assert.equal(groups.get('ae')[0].id, 'A', 'Secondary method participates in its own group');
assert.equal(groups.get('ae')[1].id, 'C');
assert.equal(groups.get('vfx').length, 2);
assert.equal(groups.get('live').length, 1);
assert.equal(groupShotsByMethod([]).size, 0);
assert.equal(JSON.stringify(shotMethodValues({})), '["live"]', 'Legacy absent method fallback');
const ids = [...new Set([...groups.values()].flatMap(group => group.map(shot => shot.id)))];
assert.deepEqual(ids, ['A', 'C', 'B'], 'Cross-group identity remains unique for selection');
console.log('Primary/secondary grouping, deduplication and selection identity check passed.');
