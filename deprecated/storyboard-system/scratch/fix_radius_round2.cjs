// R11 §14 收尾：把体系外圆角（4/5/7px）统一到令牌
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const MAP = [
  [/border-radius:\s*4px\b/g, 'border-radius: var(--radius-sm)'],
  [/border-radius:\s*5px\b/g, 'border-radius: var(--radius-sm)'],
  [/border-radius:\s*7px\b/g, 'border-radius: var(--radius-sm)'],
];

const SKIP = new Set(['workspace-v73.css']);   // 构建产物
let files = 0, hits = 0;
for (const dir of ['static', 'src/workspace']) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.css') || SKIP.has(f)) continue;
    const p = path.join(d, f);
    let s = fs.readFileSync(p, 'utf8');
    const orig = s;
    for (const [re, to] of MAP) {
      const m = s.match(re);
      if (m) hits += m.length;
      s = s.replace(re, to);
    }
    if (s !== orig) { fs.writeFileSync(p, s); files++; console.log('  改:', dir + '/' + f); }
  }
}
console.log(`收敛 ${hits} 处，涉及 ${files} 个文件`);

console.log('\n--- 复核：源文件残留体系外圆角（排除构建产物）---');
let left = 0;
for (const dir of ['static', 'src/workspace']) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.css') || SKIP.has(f)) continue;
    const s = fs.readFileSync(path.join(d, f), 'utf8');
    const m = s.match(/border-radius:\s*(4|5|7|9|11|13|14|29|31|37)px\b/g) || [];
    if (m.length) { console.log(`  ${dir}/${f}: ${m.length} 处`); left += m.length; }
  }
}
console.log(left ? `残留 ${left} 处` : '无残留');
