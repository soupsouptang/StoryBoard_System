const fs = require('fs');
const path = require('path');
const root = 'C:/Users/Hatsune/Documents/Codex/2026-08-28/referenced-chatgpt-conversation-this-is-an/storyboard-system';
function walk(dir, cb){
  let st; try{ st = fs.statSync(dir);}catch(e){ return; }
  if(st.isDirectory()){
    for(const f of fs.readdirSync(dir)){ walk(path.join(dir,f), cb); }
  } else if(dir.toLowerCase().endsWith('.glb')){ cb(dir); }
}
const groups = {};
walk(root, p=>{ const d = path.dirname(p); groups[d] = (groups[d]||0)+1; });
console.log('=== GLB count per directory ===');
Object.keys(groups).sort().forEach(d=>console.log(groups[d], d));
let maxD='', maxN=0;
Object.keys(groups).forEach(d=>{ if(groups[d]>maxN){maxN=groups[d];maxD=d;} });
console.log('\n=== Largest group full listing ('+maxN+'): '+maxD+' ===');
const files=[];
walk(maxD, p=>files.push(path.basename(p)));
files.sort().forEach(f=>console.log(f));
