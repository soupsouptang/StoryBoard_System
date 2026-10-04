// 独立验收 GP-3 交付的 5 盏灯 GLB：存在性 / 互异性(哈希) / GLB 合法性 / 未改源文件
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const GLB = path.join(root, 'static/assets/glb');

const files = [
  'arri_skypanel_x21.glb',
  'aputure_storm_1200x.glb',
  'nanlite_forza_300b_ii.glb',
  'nanlite_forza_500b_ii.glb',
  'arri_orbiter.glb',
];

console.log('=== 1. 文件存在性与哈希（互异性） ===');
const hashes = new Map();
let missing = 0;
files.forEach(f => {
  const p = path.join(GLB, f);
  if (!fs.existsSync(p)) { console.log(`  MISSING ${f}`); missing++; return; }
  const buf = fs.readFileSync(p);
  const h = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const magic = buf.subarray(0, 4).toString('ascii');
  console.log(`  ${f.padEnd(30)} ${String(buf.length).padStart(7)}B  magic=${magic}  sha=${h}`);
  if (magic !== 'glTF') console.log(`    !! magic 不是 glTF`);
  if (hashes.has(h)) console.log(`    !! 与 ${hashes.get(h)} 完全相同（改名冒充）`);
  hashes.set(h, f);
});
console.log(`唯一几何数: ${hashes.size} / ${files.length}, 缺失 ${missing}`);

console.log('\n=== 2. GLB 结构合法性 + bbox 实测 ===');
function parseGlb(buf) {
  if (buf.subarray(0, 4).toString('ascii') !== 'glTF') return null;
  const version = buf.readUInt32LE(4);
  const total = buf.readUInt32LE(8);
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const start = off + 8;
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(start, start + len).toString('utf8'));
    else if (type === 0x004e4942) bin = buf.subarray(start, start + len);
    off = start + len + ((4 - (len % 4)) % 4);
  }
  return { version, total, json, bin };
}

files.forEach(f => {
  const p = path.join(GLB, f);
  if (!fs.existsSync(p)) return;
  const g = parseGlb(fs.readFileSync(p));
  if (!g || !g.json) { console.log(`  ${f}: JSON chunk 解析失败`); return; }
  const j = g.json;
  const meshes = (j.meshes || []).length;
  // 收集所有 mesh 的 POSITION accessor min/max
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let primCount = 0;
  (j.meshes || []).forEach(m => (m.primitives || []).forEach(pr => {
    primCount++;
    const ai = pr.attributes && pr.attributes.POSITION;
    if (ai == null) return;
    const a = j.accessors[ai];
    if (!a || !a.min || !a.max) return;
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], a.min[i]); max[i] = Math.max(max[i], a.max[i]); }
  }));
  // bbox 由 mesh 顶点直接决定，单位=米 → cm
  const dimCm = [0, 1, 2].map(i => Math.round((max[i] - min[i]) * 1000) / 10);
  console.log(`  ${f.padEnd(30)} v${g.version} meshes=${meshes} prims=${primCount} bbox(cm)=${dimCm[0]}×${dimCm[1]}×${dimCm[2]}`);
  if (!g.bin) console.log('    !! 缺少 BIN chunk');
});

console.log('\n=== 3. 源文件是否被改动（git） ===');
const { execSync } = require('child_process');
try {
  const out = execSync('git status --short static/lighting-assets.js static/lighting-scene.js static/creative-boards.js static/lighting-render.js',
    { cwd: root, encoding: 'utf8' });
  console.log(out.trim() ? out.trim() : '(上述源文件无未提交改动)');
} catch (e) {
  console.log('git 查询失败:', e.message);
}

console.log('\n=== 4. spec json ===');
const specDir = path.join(root, 'film_equipment_25d_pack/metadata/replica_specs');
if (fs.existsSync(specDir)) {
  fs.readdirSync(specDir).forEach(f => {
    if (!f.endsWith('.json')) return;
    const s = JSON.parse(fs.readFileSync(path.join(specDir, f), 'utf8'));
    console.log(`  ${s.presetKey || f}  sourceVerified=${s.sourceVerified}  glb=${s.glb}`);
  });
} else console.log('  (spec 目录不存在)');
