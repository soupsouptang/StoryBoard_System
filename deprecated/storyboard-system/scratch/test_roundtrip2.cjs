// 严格往返：通过请求拦截获取 projectId，用 API 前后对比 items/objects
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  let projId = null;
  page.on('request', r => {
    const m = r.url().match(/\/api\/projects\/([0-9a-f-]{8,})\//);
    if (m) projId = m[1];
  });

  const fetchBoards = () => page.evaluate(async pid => {
    const r = await fetch('/api/projects/' + pid + '/creative-boards', { credentials: 'same-origin' });
    if (!r.ok) return { err: r.status };
    const d = await r.json();
    return d.boards.map(b => ({
      kind: b.kind, name: b.name,
      nItems: (b.items || []).length, nObjects: (b.objects || []).length,
      items: (b.items || []).map(i => ({ t: i.type, st: i.subtype, x: i.x, y: i.y })),
      objects: (b.objects || []).map(o => ({ t: o.type, st: o.subtype, x: o.transform?.position?.x, y: o.transform?.position?.y }))
    }));
  }, projId);

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    const name = 'RT2 ' + Date.now();
    await page.fill('#newProjForm [name=name]', name);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(1200);
    console.log('projectId =', projId);

    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      document.querySelectorAll('.ff-boards-library-group').forEach(g => {
        const btn = g.querySelector('button:not([hidden])');
        if (btn) btn.click();
      });
    });
    await page.waitForTimeout(3000);

    console.log('--- BEFORE SAVE ---');
    const before = await fetchBoards();
    console.log(JSON.stringify(before, null, 1));

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /保存|重试/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(3500);

    console.log('--- AFTER SAVE (server truth) ---');
    const saved = await fetchBoards();
    console.log(JSON.stringify(saved, null, 1));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    // 从 #projectGrid 里按名称点开项目
    const reopened = await page.evaluate(n => {
      const card = [...document.querySelectorAll('#projectGrid *')].find(e =>
        e.children.length === 0 && (e.textContent || '').trim() === n);
      if (!card) return false;
      const host = card.closest('button,a,li,article,div[data-project],.project-card') || card.parentElement;
      (host.tagName === 'BUTTON' || host.tagName === 'A' ? host : host).click();
      return true;
    }, name);
    console.log('reopen clicked:', reopened);
    await page.waitForTimeout(3000);
    await page.click('[data-nav-key="lighting"]').catch(() => {});
    await page.waitForTimeout(3500);

    const domCount = await page.evaluate(() => document.querySelectorAll('.ff-boards-item').length);
    console.log('DOM item nodes after reload =', domCount);
    await page.screenshot({ path: 'qa-artifacts/independent/rt-10-reloaded.png' });
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => (x.textContent || '').trim() === '2.5D');
      if (b) b.click();
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'qa-artifacts/independent/rt-11-reloaded-25d.png' });
    console.log('runtime:', JSON.stringify(await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      return rt ? { fixtures: rt.equipmentMap.size, glbs: rt.stats.loadedGlbs, meshes: rt.stats.totalMeshes } : null;
    })));
    const after = await fetchBoards();
    console.log('--- AFTER RELOAD (server truth) ---');
    console.log(JSON.stringify(after, null, 1));

    // 对称比较
    const b0 = (before || []).find(b => b.kind === 'lighting');
    const a0 = (after || []).find(b => b.kind === 'lighting');
    if (!b0 || !a0) { console.log('RESULT: MISSING lighting board before/after'); }
    else {
      const key = arr => arr.map(i => `${i.st || i.t}@${i.x},${i.y}`).sort().join('|');
      const ok = b0.nItems === a0.nItems && b0.nObjects === a0.nObjects;
      console.log(`RESULT items: ${b0.nItems} -> ${a0.nItems}, objects: ${b0.nObjects} -> ${a0.nObjects}`);
      console.log(ok ? 'ROUNDTRIP PRESERVED' : 'ROUNDTRIP LOST DATA');
      console.log('items sequence before:', key(b0.items));
      console.log('items sequence after :', key(a0.items));
    }
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await browser.close();
  }
})();
