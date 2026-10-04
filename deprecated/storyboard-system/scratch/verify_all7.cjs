// 独立验收 7 个品牌器材 GLB：存在性/互异性/合法性/bbox vs 官方尺寸
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const GLB = path.join(root, 'static/assets/glb');

// 期望尺寸（cm，来自 spec notes 中的官方/可靠来源），三轴顺序无关，用于容差比对
const EXPECT = {
  'arri_skypanel_x21.glb':       { dims: [87.5, 58.8, 17.0], src: 'ARRI 官方(含 yoke)' },
  'aputure_storm_1200x.glb':     { dims: [33.4, 33.6, 55.7], src: 'Aputure 官方(含 yoke)' },
  'nanlite_forza_300b_ii.glb':   { dims: [33.0, 22.8, 12.3], src: 'Nanlite 经销商(灯头)' },
  'nanlite_forza_500b_ii.glb':   { dims: [40.0, 23.0, 14.2], src: 'Nanlite 经销商(灯头)' },
  'arri_orbiter.glb':            { dims: [40.0, 40.0, 33.0], src: 'ARRI 官方(约值)' },
  'arri_alexa_35.glb':           { dims: [13.8, 15.2, 18.8], src: '项目内部值(机身)' },
  'avenger_cstand_a2033f.glb':   { dims: [84.0, 84.0, 84.0], src: '33"≈84cm 立杆高度' },
};

function parseGlb(buf) {
  if (buf.subarray(0, 4).toString('ascii') !== 'glTF') return null;
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), start = off + 8;
    if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(start, start + len).toString('utf8'));
    else if (type === 0x004e4942) bin = buf.subarray(start, start + len);
    off = start + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}

console.log('文件'.padEnd(30) + '大小'.padStart(8) + '  sha16     bbox(cm)              判定');
console.log('-'.repeat(96));
const hashes = new Map();
let pass = 0, fail = 0;

Object.keys(EXPECT).forEach(f => {
  const p = path.join(GLB, f);
  if (!fs.existsSync(p)) { console.log(`${f.padEnd(30)} MISSING`); fail++; return; }
  const buf = fs.readFileSync(p);
  const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
  if (hashes.has(sha)) { console.log(`${f.padEnd(30)} !! 与 ${hashes.get(sha)} 重复`); fail++; return; }
  hashes.set(sha, f);

  const g = parseGlb(buf);
  if (!g || !g.json || !g.bin) { console.log(`${f.padEnd(30)} !! GLB 结构非法`); fail++; return; }

  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], prims = 0;
  (g.json.meshes || []).forEach(m => (m.primitives || []).forEach(pr => {
    prims++;
    const ai = pr.attributes && pr.attributes.POSITION;
    if (ai == null) return;
    const a = g.json.accessors[ai];
    if (!a || !a.min || !a.max) return;
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], a.min[i]); max[i] = Math.max(max[i], a.max[i]); }
  }));
  const got = [0, 1, 2].map(i => Math.round((max[i] - min[i]) * 1000) / 10);

  // 容差判定：三轴排序后逐项比对（生成时轴序可能不同），允许 15% 或 3cm 绝对误差
  const exp = EXPECT[f].dims.slice().sort((a, b) => a - b);
  const act = got.slice().sort((a, b) => a - b);
  let ok = true, worst = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(act[i] - exp[i]);
    const tol = Math.max(exp[i] * 0.15, 3);
    worst = Math.max(worst, d / Math.max(exp[i], 1));
    if (d > tol) ok = false;
  }
  const verdict = ok ? 'OK' : `偏差${Math.round(worst * 100)}%`;
  if (ok) pass++; else fail++;
  console.log(`${f.padEnd(30)}${String(buf.length).padStart(7)}B  ${sha}  ${got.join('×').padEnd(20)} ${verdict}  (期望 ${exp.join('×')} ${EXPECT[f].src})`);
});

console.log('-'.repeat(96));
console.log(`通过 ${pass} / ${Object.keys(EXPECT).length}，失败 ${fail}，唯一几何 ${hashes.size}`);
