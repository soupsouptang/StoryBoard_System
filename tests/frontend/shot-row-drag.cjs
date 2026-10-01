// Synthetic ordering check: node tests/frontend/shot-row-drag.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/shot-row-drag.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { module: mod, exports: mod.exports });
const move = (...args) => Array.from(mod.exports.insertShotGroup(...args));
const ids = ['A', 'B', 'C', 'D', 'E'];
assert.deepEqual(move(ids, ['E','C'], 'B', false), ['A','C','E','B','D']);
assert.deepEqual(move(ids, ['A','C'], 'E', true), ['B','D','E','A','C']);
assert.deepEqual(move(ids, ['B'], 'D', false), ['A','C','B','D','E']);
assert.deepEqual(move(ids, ['B','D'], 'D', true), ids);
assert.deepEqual(move(ids, ['B'], 'missing', true), ids);
assert.deepEqual(ids, ['A','B','C','D','E']);
console.log('Group insertion preserves canonical selected and hidden/unselected order.');
