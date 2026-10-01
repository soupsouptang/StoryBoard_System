// Synthetic state-owner check: node tests/frontend/shot-selection.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/stores/useWorkspaceStore.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { module: moduleObject, exports: moduleObject.exports, require });
const store = moduleObject.exports.useWorkspaceStore;
const ids = ['A', 'B', 'C', 'D', 'E'];
const choose = (id, shift = false, command = false) => store.getState().selectShot(id, shift, command, ids);
const selected = expected => assert.deepEqual(Array.from(store.getState().selectedShotIds), expected);
choose('B'); choose('D', true); selected(['B', 'C', 'D']);
choose('A', true); selected(['A', 'B']); // Same anchor, upward range replaces previous range.
choose('E'); selected(['E']);
choose('A', false, true); selected(['E', 'A']);
choose('E', false, true); selected(['A']);
store.getState().selectAllShots(['B', 'D']); selected(['B', 'D']); // Filter result IDs only.
store.getState().clearSelection(); selected([]);
choose('C', true); selected(['C']); // Shift without an anchor establishes it.
console.log('Single, anchored range, arbitrary toggle and filtered all selection passed.');
