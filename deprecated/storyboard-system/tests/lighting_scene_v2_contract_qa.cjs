/**
 * lighting_scene_v2_contract_qa.cjs
 * Matrix contract test for FrameForgeLightingScene V2.
 * Automatically enumerates all type x subtype in FrameForgeLightingScene.PRESETS,
 * asserts creation, serialization, V2 object shape, and property preservation.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('[QA] Starting Lighting Scene V2 Contract Matrix Test...');

const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/lighting-scene.js'), 'utf8'), sandbox);
const S = sandbox.FrameForgeLightingScene || sandbox.module?.exports;
assert.ok(S, 'FrameForgeLightingScene must be exported');
const PRESETS = S.PRESETS;
assert.ok(PRESETS, 'PRESETS must be exported');

let totalTested = 0;

for (const type of Object.keys(PRESETS)) {
  const subtypes = PRESETS[type];
  for (const subtype of Object.keys(subtypes)) {
    const pDef = subtypes[subtype];
    const obj = S.createObject(type, subtype, { x: 120, y: 140, z: pDef.defaultZ || 0 });

    // 1. Identity & type checks
    assert.ok(obj.id && obj.id.startsWith('obj-'), `${type}/${subtype}: id must be generated`);
    assert.strictEqual(obj.type, type, `${type}/${subtype}: type must match`);
    assert.strictEqual(obj.subtype, subtype, `${type}/${subtype}: subtype must match`);

    // 2. Transform checks
    assert.strictEqual(obj.transform.position.x, 120);
    assert.strictEqual(obj.transform.position.y, 140);
    assert.strictEqual(obj.transform.position.z, pDef.defaultZ || 0);
    assert.strictEqual(obj.transform.scale.x, pDef.width || 100);
    assert.strictEqual(obj.transform.scale.y, pDef.height || 100);

    // 3. Properties preservation
    const expectedProps = pDef.props || {};
    for (const pk of Object.keys(expectedProps)) {
      assert.strictEqual(
        obj.properties[pk],
        expectedProps[pk],
        `${type}/${subtype}: property ${pk} mismatch (got ${obj.properties[pk]}, expected ${expectedProps[pk]})`
      );
    }

    // 4. Round-trip through migrateItem & demoteItem
    const demoted = S.demoteItem(obj);
    assert.ok(demoted.id, `${type}/${subtype}: demoted id missing`);
    assert.strictEqual(demoted.subtype, subtype, `${type}/${subtype}: demoted subtype must be preserved`);
    assert.strictEqual(demoted.x, 120);
    assert.strictEqual(demoted.y, 140);

    const remigrated = S.migrateItem(demoted);
    assert.strictEqual(remigrated.type, type, `${type}/${subtype}: remigrated type must match`);
    assert.strictEqual(remigrated.subtype, subtype, `${type}/${subtype}: remigrated subtype must match`);

    // Check specific preset properties preserved through round trip
    if (expectedProps.manufacturer) {
      assert.strictEqual(remigrated.properties.manufacturer, expectedProps.manufacturer);
    }
    if (expectedProps.model) {
      assert.strictEqual(remigrated.properties.model, expectedProps.model);
    }
    if (expectedProps.attachment) {
      assert.strictEqual(remigrated.properties.attachment, expectedProps.attachment);
    }

    totalTested++;
  }
}

// 5. Build full scene with all objects and test normalizeScene & demoteScene
const allObjects = [];
for (const type of Object.keys(PRESETS)) {
  for (const subtype of Object.keys(PRESETS[type])) {
    allObjects.push(S.createObject(type, subtype));
  }
}

const v2Scene = {
  id: 'scene-full-matrix',
  name: 'Full Matrix Scene',
  version: S.SCENE_VERSION,
  schemaVersion: S.SCENE_VERSION,
  environment: { roomWidth: 2400, roomDepth: 1800 },
  settings: { unit: 'cm', gridSize: 100, snapEnabled: true, showGrid: true, defaultView: '2.5d' },
  objects: allObjects
};

const norm = S.normalizeScene(v2Scene);
assert.strictEqual(norm.objects.length, totalTested, 'All objects preserved in normalizeScene');
assert.strictEqual(norm.schemaVersion, 2);

const demotedScene = S.demoteScene(norm);
assert.strictEqual(demotedScene.items.length, totalTested, 'All items preserved in demoteScene');
assert.strictEqual(demotedScene.objects.length, totalTested, 'All objects preserved in demoteScene');

console.log(`[QA] PASS: All ${totalTested} presets in matrix validated for V2 persistence contract.`);
