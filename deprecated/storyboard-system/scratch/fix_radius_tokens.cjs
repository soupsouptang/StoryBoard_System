// 收敛体系外 radius 到 R11 §14 Design Token
// 注意：必须用文件执行，不能 heredoc —— bash 会把 \s 吞成 /s 导致正则失效
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const MAP = [
  [/\bborder-radius:\s*9px\b/g,  'border-radius: var(--radius-lg)'],
  [/\bborder-radius:\s*11px\b/g, 'border-radius: var(--radius-lg)'],
  [/\bborder-radius:\s*14px\b/g, 'border-radius: var(--radius-xl)'],
];

let files = 0, hits = 0;
for (const f of fs.readdirSync(path.join(root, 'static'))) {
  if (!f.endsWith('.css')) continue;
  if (f === 'workspace-v73.css') continue;          // 构建产物，禁止直接改
  const p = path.join(root, 'static', f);
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  for (const [re, to] of MAP) {
    const m = s.match(re);
    if (m) hits += m.length;
    s = s.replace(re, to);
  }
  if (s !== orig) { fs.writeFileSync(p, s); files++; console.log('  改:', f); }
}
console.log(`收敛 ${hits} 处 radius，涉及 ${files} 个文件`);

// 复核
console.log('\n--- 复核残留 ---');
for (const f of fs.readdirSync(path.join(root, 'static'))) {
  if (!f.endsWith('.css') || f === 'workspace-v73.css') continue;
  const s = fs.readFileSync(path.join(root, 'static', f), 'utf8');
  const left = (s.match(/\bborder-radius:\s*(9|11|13|14|29|31|37)px\b/g) || []);
  if (left.length) console.log(`  ${f}: ${left.length} 处 → ${left.slice(0, 3).join(', ')}`);
}
console.log('(以上为空即全部收敛)');
