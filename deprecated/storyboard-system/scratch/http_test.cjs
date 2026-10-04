const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = 'C:/Users/Hatsune/Documents/Codex/2026-08-28/referenced-chatgpt-conversation-this-is-an/storyboard-system';
const SRC = path.join(ROOT, 'static/lighting-assets.js');
const code = fs.readFileSync(SRC, 'utf8');
const sandbox = { module: { exports: {} }, console, setTimeout, process };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const api = sandbox.module.exports && sandbox.module.exports.ASSET_MAP ? sandbox.module.exports : sandbox.FrameForgeLightingAssets;
const ASSET_MAP = api.ASSET_MAP;

const BASE_URL = 'http://127.0.0.1:18799/';

// Build list of entries with effective glb url (cc0glb preferred, per getGLBUrl/getManifest)
const entries = [];
for (const key of Object.keys(ASSET_MAP)) {
  const a = ASSET_MAP[key];
  const parts = key.split('/');
  const type = parts[0];
  const subtype = parts[1] || parts[0];
  const eff = a.cc0glb || a.glb || null;
  entries.push({ key, type, subtype, glb: a.glb || null, cc0glb: a.cc0glb || null, eff, manufacturer: a.manufacturer || null, zh: a.zh });
}

async function head(url) {
  try {
    // Server does not implement HEAD (returns 501), use GET.
    const r = await fetch(url, { method: 'GET' });
    let len = 0;
    try { len = Number(r.headers.get('content-length') || 0); } catch (_) {}
    return { status: r.status, len };
  } catch (e) {
    return { status: -1, err: String(e.message || e) };
  }
}

(async () => {
  // Test every referenced effective URL (unique)
  const uniq = {};
  for (const e of entries) if (e.eff && !uniq[e.eff]) uniq[e.eff] = e.eff;
  const results = {};
  for (const f of Object.keys(uniq)) {
    const url = BASE_URL + f;
    const r = await head(url);
    results[f] = r;
    console.log('HTTP', r.status, f);
  }

  // Group by type
  const groups = {};
  for (const e of entries) {
    if (!groups[e.type]) groups[e.type] = { total: 0, ok: 0, bad: 0, items: [] };
    groups[e.type].total++;
    if (!e.eff) { groups[e.type].items.push({ key: e.key, status: 'no-glb', file: null }); continue; }
    const r = results[e.eff];
    const s = r ? r.status : '?';
    if (s === 200) groups[e.type].ok++; else groups[e.type].bad++;
    groups[e.type].items.push({ key: e.key, status: s, file: e.eff, mfr: e.manufacturer });
  }

  console.log('\n===== SUMMARY BY TYPE =====');
  for (const t of Object.keys(groups).sort()) {
    const g = groups[t];
    console.log(`${t}: entries=${g.total} ok200=${g.ok} bad=${g.bad}`);
  }
  const total = entries.length;
  const noGlb = entries.filter(e=>!e.eff).length;
  const tested = entries.filter(e=>e.eff);
  const okCount = tested.filter(e=>results[e.eff] && results[e.eff].status===200).length;
  const badCount = tested.length - okCount;
  console.log(`\nTOTAL ASSET_MAP entries=${total}, with-glb=${tested.length}, no-glb=${noGlb}, http200=${okCount}, not200=${badCount}`);

  // 404 / bad detail
  console.log('\n===== BAD URLS (not 200) =====');
  for (const e of entries) {
    if (e.eff && results[e.eff] && results[e.eff].status !== 200) {
      console.log(`  ${e.key}  (mfr=${e.manufacturer||'-'})  eff=${e.eff}  status=${results[e.eff].status}`);
    }
  }

  // Branded entries whose model is a generic/CC0 prop (impersonation check)
  console.log('\n===== BRANDED (manufacturer) ENTRIES =====');
  for (const e of entries) {
    if (e.manufacturer) {
      console.log(`  ${e.key}  mfr=${e.manufacturer}  zh=${e.zh}  glb=${e.glb}  cc0glb=${e.cc0glb}`);
    }
  }
  fs.writeFileSync(path.join(ROOT,'scratch','http_results.json'), JSON.stringify({ groups, entries, results }, null, 2));
  console.log('\nWrote scratch/http_results.json');
})();
