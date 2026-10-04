/* Lighting Scene V2 数据层测试：迁移、降级、往返一致性 */
const assert = require('assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/lighting-scene.js'), 'utf8'), sandbox);
const S = sandbox.FrameForgeLightingScene;
assert.ok(S, 'FrameForgeLightingScene 应挂到沙箱全局');

// 1. V1 → V2 迁移
const v1 = {
  id: 'obj1', type: 'light', x: 100, y: 200, width: 180, height: 120,
  rotation: 45, z: 250, label: '主光',
  attachment: 'grid', beam_spread: 40, intensity: 80, temperature: 5600,
};
const obj = S.migrateItem(v1);
assert.strictEqual(obj.type, 'light');
assert.strictEqual(obj.subtype, 'cob');
assert.strictEqual(obj.transform.position.x, 100);
assert.strictEqual(obj.transform.position.y, 200);
assert.strictEqual(obj.transform.position.z, 250);
assert.strictEqual(obj.transform.rotation.z, 45);
assert.strictEqual(obj.transform.scale.x, 180);
assert.strictEqual(obj.properties.attachment, 'grid');
assert.strictEqual(obj.properties.beamSpread, 40);
assert.strictEqual(obj.properties.intensity, 80);
assert.strictEqual(obj.properties.aimPan, 0);
assert.strictEqual(obj.properties.aimTilt, 0);

// 2. 无 z 的旧数据 → 按类型给默认值
const noZ = S.migrateItem({ id: 'x', type: 'camera', x: 0, y: 0, width: 100, height: 100, rotation: 0 });
assert.strictEqual(noZ.transform.position.z, 120, 'camera 默认 z=120');
const actor = S.migrateItem({ id: 'a', type: 'actor', x: 0, y: 0, width: 100, height: 100, rotation: 0 });
assert.strictEqual(actor.transform.position.z, 0, 'actor 默认 z=0');
assert.strictEqual(actor.properties.height, 170);

// 3. V2 → V1 降级（后端合同不变）
const back = S.demoteItem(obj);
assert.strictEqual(back.type, 'light');
assert.strictEqual(back.x, 100);
assert.strictEqual(back.y, 200);
assert.strictEqual(back.z, 250);
assert.strictEqual(back.rotation, 45);
assert.strictEqual(back.attachment, 'grid');
assert.strictEqual(back.beam_spread, 40);

// 4. 往返一致性（V1 → V2 → V1 不丢信息）
const round = S.demoteItem(S.migrateItem(back));
assert.strictEqual(round.x, back.x);
assert.strictEqual(round.y, back.y);
assert.strictEqual(round.z, back.z);
assert.strictEqual(round.beam_spread, back.beam_spread);

// 5. Scene normalize + demote
const board = { id: 'b1', kind: 'lighting', name: '灯光图 1', width: 1600, height: 1000, shot_ids: ['s1'], items: [v1] };
const scene = S.normalizeScene(board);
assert.strictEqual(scene.version, S.SCENE_VERSION);
assert.strictEqual(scene.objects.length, 1);
assert.strictEqual(scene.settings.unit, 'cm');
assert.strictEqual(scene.environment.roomWidth, 1600);

const demoted = S.demoteScene(scene);
assert.strictEqual(demoted.id, 'b1');
assert.strictEqual(demoted.kind, 'lighting');
assert.strictEqual(demoted.items.length, 1);
assert.strictEqual(demoted.items[0].type, 'light');
assert.deepStrictEqual(demoted.shot_ids, ['s1']);

// 6. createObject
const cam = S.createObject('camera', 'cinema', { x: 300, y: 400 });
assert.strictEqual(cam.type, 'camera');
assert.strictEqual(cam.transform.position.x, 300);
assert.strictEqual(cam.transform.position.z, 120, 'camera createObject 默认 z=120');

// 7. computeFov
const fov = S.computeFov(cam);
assert.ok(fov > 40 && fov < 60, `35mm/36mm FOV 应在 40-60° 之间，实际 ${fov}`);

// 8. beamLengthCm
assert.strictEqual(S.beamLengthCm(obj), 300, '无 beam_length 时默认 300');

console.log('PASS scene migration, demote, round-trip, normalize, create, fov');
