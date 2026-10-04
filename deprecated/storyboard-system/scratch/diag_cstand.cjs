// 诊断：Avenger C-Stand 为何 glbLoaded=false
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(20000);
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 200)));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', r => logs.push('REQFAIL: ' + r.url().split('/').pop() + ' ' + (r.failure()?.errorText || '')));

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-diag-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);

    // 1) 资产表里的 URL
    const url = await page.evaluate(() => {
      const A = globalThis.FrameForgeLightingAssets;
      if (!A) return 'NO MODULE';
      return {
        glbUrl: A.getGLBUrl('grip', 'avenger_a2033f'),
        asset: A.getAsset('grip', 'avenger_a2033f'),
        status: A.getAssetStatus('grip', 'avenger_a2033f')
      };
    });
    console.log('资产表:', JSON.stringify(url, null, 1));

    // 2) 直接 fetch 该 GLB
    const fetchRes = await page.evaluate(async u => {
      try {
        const r = await fetch(u);
        const buf = await r.arrayBuffer();
        return { status: r.status, bytes: buf.byteLength, magic: new TextDecoder().decode(new Uint8Array(buf, 0, 4)) };
      } catch (e) { return { err: e.message }; }
    }, url.glbUrl);
    console.log('fetch GLB:', JSON.stringify(fetchRes));

    // 3) 用 three.js GLTFLoader 直接解析，看是否报错
    const parseRes = await page.evaluate(async u => {
      const THREE = globalThis.THREE;
      if (!THREE || !THREE.GLTFLoader) return 'NO GLTFLoader';
      return await new Promise(resolve => {
        new THREE.GLTFLoader().load(u,
          gltf => {
            let meshes = 0;
            gltf.scene.traverse(o => { if (o.isMesh) meshes++; });
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = box.getSize(new THREE.Vector3());
            resolve({ ok: true, meshes, sizeCm: [Math.round(size.x * 100), Math.round(size.y * 100), Math.round(size.z * 100)] });
          },
          undefined,
          err => resolve({ ok: false, err: String(err && err.message || err) })
        );
      });
    }, url.glbUrl);
    console.log('GLTFLoader 解析:', JSON.stringify(parseRes));

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('--- logs ---');
    console.log(logs.slice(-12).join('\n') || '(none)');
    await browser.close();
  }
})();
