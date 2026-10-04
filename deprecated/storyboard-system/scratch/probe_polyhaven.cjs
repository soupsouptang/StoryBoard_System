// 探查 Poly Haven files API 中的 glTF 条目 + 实测下载
const https = require('https');
const fs = require('fs');
const path = require('path');

function get(url, timeout = 25000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location, timeout).then(resolve, reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const CANDIDATES = [
  'Caged_Hanging_Light', 'Hanging_Industrial_Lamp', 'Industrial_Pipe_Lamp',
  'Desk_Lamp_Arm_01', 'Camera_01', 'Coffee_Table_01', 'ArmChair_01'
];

(async () => {
  for (const asset of CANDIDATES) {
    try {
      const r = await get('https://api.polyhaven.com/files/' + asset);
      if (r.status !== 200) { console.log(`${asset}: HTTP ${r.status}`); continue; }
      const j = JSON.parse(r.body);
      // 找 gltf 条目
      const gltf = j.gltf || j.GLTF || null;
      let url = null, size = null;
      if (gltf) {
        const firstRes = Object.keys(gltf)[0];
        const entry = gltf[firstRes];
        if (entry && entry.gltf) { url = entry.gltf.url; size = entry.gltf.size; }
        else if (entry && typeof entry === 'object') {
          const k = Object.keys(entry).find(x => entry[x] && entry[x].url);
          if (k) { url = entry[k].url; size = entry[k].size; }
        }
      }
      console.log(`${asset.padEnd(24)} gltf=${url ? (Math.round(size / 1024) + 'KB') : 'NONE'}  keys=${Object.keys(j).join('/')}`);
      if (url) console.log(`   ${url}`);
    } catch (e) {
      console.log(`${asset}: ERR ${e.message}`);
    }
  }

  // 实测下载一个 glTF
  console.log('\n=== 实测下载 ===');
  try {
    const r = await get('https://api.polyhaven.com/files/Caged_Hanging_Light');
    const j = JSON.parse(r.body);
    const g = j.gltf || {};
    const resKey = Object.keys(g)[0];
    const entry = g[resKey] || {};
    const g2 = entry.gltf || entry[Object.keys(entry).find(x => entry[x] && entry[x].url)];
    if (!g2 || !g2.url) { console.log('无 glTF URL'); return; }
    console.log('下载:', g2.url, Math.round(g2.size / 1024) + 'KB');
    const out = path.join(__dirname, '..', 'scratch', 'ph_test.glb');
    await new Promise((resolve, reject) => {
      const f = fs.createWriteStream(out);
      https.get(g2.url, res => {
        if (res.statusCode >= 300 && res.headers.location) {
          https.get(res.headers.location, r2 => { r2.pipe(f); r2.on('end', () => { f.close(resolve); }); }).on('error', reject);
        } else { res.pipe(f); res.on('end', () => { f.close(resolve); }); }
      }).on('error', reject);
    });
    const buf = fs.readFileSync(out);
    console.log(`已保存 ${out}  ${buf.length} bytes  magic=${buf.subarray(0, 4).toString('ascii')}`);
  } catch (e) {
    console.log('下载失败:', e.message);
  }
})();
