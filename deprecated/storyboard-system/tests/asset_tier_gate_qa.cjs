// 资产分级契约校验（Production Gate）
// 用法: node tests/asset_tier_gate_qa.cjs
// 规则来自 FRAMEFORGE LONG_RUNNING_TASK VNEXT 0A.36 / 0A.37 / P0_REOPEN 5.5
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GLB_DIR = path.join(ROOT, 'static/assets/glb');
const src = fs.readFileSync(path.join(ROOT, 'static/lighting-assets.js'), 'utf8');

// ---- 解析 ASSET_MAP 条目（type/subtype -> 字段）----
const entryRe = /^ {2}'([a-z_]+)\/([a-z0-9_]+)':\s*\{([\s\S]*?)\n {2}\},?$/gm;
const entries = [];
let m;
while ((m = entryRe.exec(src))) {
  const type = m[1], subtype = m[2], body = m[3];
  const get = re => (body.match(re) || [])[1] || null;
  entries.push({
    key: type + '/' + subtype,
    type, subtype,
    glb: get(/glb:\s*BASE\s*\+\s*'([^']+)'/),
    cc0glb: get(/cc0glb:\s*BASE\s*\+\s*'([^']+)'/),
    zh: get(/zh:\s*'([^']*)'/) || '',
    manufacturer: get(/manufacturer:\s*'([^']*)'/),
    model: get(/model:\s*'([^']*)'/),
    tier: get(/tier:\s*'([^']*)'/),
    realGeometry: /realGeometry:\s*true/.test(body),
    verifiedSpecs: /verifiedSpecs:\s*true/.test(body),
    specSource: get(/specSource:\s*'([^']*)'/),
    iesUrl: get(/iesUrl:\s*'([^']*)'/),
    license: get(/license:\s*'([^']*)'/),
  });
}

if (!entries.length) {
  console.error('解析 ASSET_MAP 失败 —— 条目数为 0，请检查正则或文件格式');
  process.exit(1);
}

// ---- 几何共用检测：同一 GLB 被多个 preset 引用 = 共享基型 ----
const byGlb = new Map();
entries.forEach(e => {
  if (!e.glb) return;
  if (!byGlb.has(e.glb)) byGlb.set(e.glb, []);
  byGlb.get(e.glb).push(e.key);
});
const shared = [...byGlb.entries()].filter(([, keys]) => keys.length > 1);

const errors = [];
const warnings = [];
const tiers = {};

const CLAIMS_BRAND = e => !!(e.manufacturer || e.model);

entries.forEach(e => {
  tiers[e.tier || '(未声明)'] = (tiers[e.tier || '(未声明)'] || 0) + 1;

  // 文件必须存在
  [e.glb, e.cc0glb].forEach(f => {
    if (f && !fs.existsSync(path.join(GLB_DIR, f))) {
      errors.push(`${e.key}: 引用的 GLB 不存在 -> ${f}`);
    }
  });

  if (!CLAIMS_BRAND(e)) return; // 通用条目不参与品牌一致性校验

  const sharesGeometry = e.glb && (byGlb.get(e.glb) || []).length > 1;

  // 硬规则 1：品牌条目不得依赖共享基型几何自称 replica / digital_twin
  if (sharesGeometry && /replica|digital_twin/.test(e.tier || '')) {
    errors.push(`${e.key}: 与 ${(byGlb.get(e.glb) || []).filter(k => k !== e.key).join(', ')} 共用 ${e.glb}，不得自称 ${e.tier}`);
  }

  // 硬规则 2：digital_twin 必须同时具备 原生几何 + IES + license + 已核验尺寸
  if (e.tier === 'digital_twin') {
    if (!e.realGeometry) errors.push(`${e.key}: digital_twin 缺少 realGeometry:true（需厂商原生 CAD/STEP 派生）`);
    if (!e.iesUrl) errors.push(`${e.key}: digital_twin 缺少 IES 光度文件`);
    if (!e.license) errors.push(`${e.key}: digital_twin 缺少 license 声明`);
    if (!e.verifiedSpecs) errors.push(`${e.key}: digital_twin 缺少 verifiedSpecs:true`);
  }

  // 硬规则 3：engineering_replica 必须专属几何 + 尺寸来源
  if (e.tier === 'engineering_replica') {
    if (!e.realGeometry) errors.push(`${e.key}: engineering_replica 缺少 realGeometry:true`);
    if (!e.verifiedSpecs || !e.specSource) errors.push(`${e.key}: engineering_replica 缺少 verifiedSpecs 或 specSource`);
  }

  // 软规则：声明了品牌但没声明分级
  if (!e.tier) warnings.push(`${e.key}: 声明品牌但未声明 tier，将按 STAGING 处理`);
});

// ---- 报告 ----
console.log('=== 资产分级契约校验 ===');
console.log('条目总数:', entries.length);
console.log('分级分布:', JSON.stringify(tiers));
console.log('共享基型组数:', shared.length);
shared.forEach(([g, keys]) => console.log(`  ${g} <- ${keys.length} 个 preset: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ' …' : ''}`));

if (warnings.length) {
  console.log('\n--- 警告 ---');
  warnings.forEach(w => console.log('  ' + w));
}

if (errors.length) {
  console.log('\n--- 不合规（阻断 Production Gate）---');
  errors.forEach(e => console.log('  ' + e));
  console.log(`\nFAIL: ${errors.length} 项不合规`);
  process.exit(1);
}

console.log('\nPASS: 资产分级全部合规');
