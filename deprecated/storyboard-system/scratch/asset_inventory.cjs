const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'static/lighting-assets.js'), 'utf8');
const re = /'([a-z_]+)\/([a-z0-9_]+)':\s*\{([\s\S]*?)\n  \}/g;
let m, rows = [];
while ((m = re.exec(src))) {
  const body = m[3];
  const glb = (body.match(/glb:\s*BASE\s*\+\s*'([^']+)'/) || [])[1] || null;
  const cc0 = (body.match(/cc0glb:\s*BASE\s*\+\s*'([^']+)'/) || [])[1] || null;
  const zh = (body.match(/zh:\s*'([^']*)'/) || [])[1] || '';
  rows.push({ key: m[1] + '/' + m[2], glb, cc0, zh });
}
console.log('ASSET_MAP entries =', rows.length);
const uniq = [...new Set(rows.map(r => r.glb))];
console.log('distinct generated glb =', uniq.length);
uniq.forEach(g => console.log('   ' + g));
const miss = rows.filter(r => r.glb && !fs.existsSync(path.join(root, 'static/assets/glb', r.glb)));
console.log('MISSING primary glb =', miss.length);
miss.forEach(r => console.log('   ' + r.key + ' -> ' + r.glb));
const misscc = rows.filter(r => r.cc0 && !fs.existsSync(path.join(root, 'static/assets/glb', r.cc0)));
console.log('MISSING cc0 fallback =', misscc.length);
misscc.forEach(r => console.log('   ' + r.key + ' -> ' + r.cc0));
const brand = rows.filter(r => !/\u706f|\u9762\u677f|\u6843|\u67b1|\u67b6|\u684c|\u6905|\u6c99|\u95e8|\u7a97|\u5899|\u6f14|\u6444|\u76d1|\u9ea6|\u53cd|\u67d4|\u9ed1|\u65d7|\u4e9a|\u9057|\u6807|\u5bf9|\u5c3a|\u573a|\u8bf4|\u6807\u8bb0|\u7bad/.test(r.zh));
console.log('BRAND-like presets (real model names) =', brand.length);
brand.forEach(r => console.log('   ' + r.key + '  ' + r.zh));
