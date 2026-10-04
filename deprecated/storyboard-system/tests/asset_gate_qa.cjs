// 资产分级门禁（回归用）：防止「通用模型冠品牌名」再次发生
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sandbox = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'static/lighting-assets.js'), 'utf8'), sandbox,
  { filename: 'lighting-assets.js' });

const A = sandbox.FrameForgeLightingAssets;
const MAP = A.ASSET_MAP;
const GLB_DIR = path.join(root, 'static/assets/glb');

const problems = [];
const byGlb = new Map();

Object.keys(MAP).forEach(key => {
  const e = MAP[key] || {};
  const claimsReal = !!(e.manufacturer || e.model);

  // 1) 引用的几何文件必须真实存在
  [e.glb, e.cc0glb].filter(Boolean).forEach(rel => {
    const f = path.join(GLB_DIR, path.basename(rel));
    if (!fs.existsSync(f)) problems.push(`${key}: 引用不存在的几何文件 ${rel}`);
  });

  // 2) 统计几何共用情况
  if (e.glb) byGlb.set(e.glb, (byGlb.get(e.glb) || 0) + 1);

  // 3) 声称真实器材 → 不允许拿共用基型充数
  if (claimsReal && e.glb && byGlbSharesWith(e.glb, key)) {
    // 共用检测在下方统一判定
  }

  // 4) 分级必须自洽
  const [type, subtype] = key.split('/');
  const status = A.getAssetStatus(type, subtype);
  if (status === 'digital_twin') {
    // 数字孪生要求原生 CAD/STEP + IES + license 证据
    if (!e.twin) problems.push(`${key}: 标 digital_twin 但缺少 twin:true`);
    if (!e.verifiedSpecs) problems.push(`${key}: digital_twin 缺少 verifiedSpecs`);
    if (!e.iesUrl) problems.push(`${key}: digital_twin 缺少 IES 光度文件 (iesUrl)`);
    if (!e.license) problems.push(`${key}: digital_twin 缺少 license 声明`);
  }
  if (status === 'replica') {
    if (!e.specSource) problems.push(`${key}: replica 缺少官方规格来源 specSource`);
    if (!e.verifiedSpecs) problems.push(`${key}: replica 缺少 verifiedSpecs`);
  }
  // 5) 共用基型不得自称 replica / digital_twin
  if (claimsReal && e.glb && (e.replica || e.twin)) {
    const owners = Object.keys(MAP).filter(k => (MAP[k] || {}).glb === e.glb);
    if (owners.length > 1) {
      problems.push(`${key}: 与 [${owners.filter(o => o !== key).join(', ')}] 共用 ${e.glb}，不得自称 replica/digital_twin`);
    }
  }
});

function byGlbSharesWith(glb, selfKey) {
  return Object.keys(MAP).some(k => k !== selfKey && (MAP[k] || {}).glb === glb);
}

// 汇总输出
const tally = {};
Object.keys(MAP).forEach(key => {
  const [t, s] = key.split('/');
  const st = A.getAssetStatus(t, s);
  tally[st] = (tally[st] || 0) + 1;
});
const shared = [...byGlb.entries()].filter(([, n]) => n > 1);

console.log('分级统计:', JSON.stringify(tally));
console.log('共用几何的基型:', shared.length);
shared.forEach(([g, n]) => console.log(`   ${g} 被 ${n} 个 preset 共用`));

assert.strictEqual(tally.digital_twin || 0, 0,
  '当前不应有任何资产自称 DIGITAL TWIN（缺原生 CAD/STEP + IES + license 证据）');
assert.deepStrictEqual(problems, [],
  '资产分级门禁发现问题:\n' + problems.join('\n'));

console.log('PASS 资产分级门禁：无伪造 DIGITAL TWIN，声称真型号的条目均落在 replica/staging，几何引用完整');
