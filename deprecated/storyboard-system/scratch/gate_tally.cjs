// 读取静态源码，在内存中执行两个模块，输出当前门禁分级统计
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

const sandbox = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

['static/lighting-scene.js', 'static/lighting-assets.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
});

const A = sandbox.FrameForgeLightingAssets;
const map = A.ASSET_MAP;
const tally = {};
const rows = [];
Object.keys(map).forEach(k => {
  const [t, s] = k.split('/');
  const entry = A.getAsset(t, s) || {};
  const st = A.getAssetStatus(t, s);
  tally[st] = (tally[st] || 0) + 1;
  rows.push({ key: k, status: st, glb: (entry.glb || '').split('/').pop(), hasMfr: !!(entry.manufacturer || entry.model) });
});
console.log('=== 门禁分级统计 ===');
console.log(JSON.stringify(tally, null, 1));
console.log('=== 声称真实器材的条目 ===');
rows.filter(r => r.hasMfr).forEach(r => console.log('  ' + r.status.padEnd(14) + r.key + '  -> ' + r.glb));
console.log('=== digital_twin 数 ===', rows.filter(r => r.status === 'digital_twin').length);
