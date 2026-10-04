const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const s = fs.readFileSync(path.join(root, 'static/lighting-assets.js'), 'utf8');

const ws = '[ \\t\\r\\n]';
const keyRe = new RegExp('^  \'([a-z_]+)/([a-z0-9_]+)\':' + ws + '*\\{', 'gm');
const keys = [...s.matchAll(keyRe)].map(m => m[1] + '/' + m[2]);
console.log('ASSET_MAP entries =', keys.length);

const glbRe = new RegExp('glb:' + ws + '*BASE' + ws + '*\\+' + ws + '*\'([^\']+)\'', 'g');
const cc0Re = new RegExp('cc0glb:' + ws + '*BASE' + ws + '*\\+' + ws + '*\'([^\']+)\'', 'g');
const g = [...s.matchAll(glbRe)].map(m => m[1]);
const c = [...s.matchAll(cc0Re)].map(m => m[1]);
console.log('primary glb refs =', g.length, '| distinct =', new Set(g).size);
console.log('cc0 refs        =', c.length, '| distinct =', new Set(c).size);

const missing = [...new Set([...g, ...c])].filter(f => !fs.existsSync(path.join(root, 'static/assets/glb', f)));
console.log('referenced-but-missing files =', missing.length);
missing.forEach(f => console.log('   MISSING ' + f));

const groups = {};
keys.forEach(k => { const t = k.split('/')[0]; groups[t] = (groups[t] || 0) + 1; });
console.log('--- entries by type ---');
Object.entries(groups).forEach(([t, n]) => console.log('   ' + t.padEnd(14) + n));
