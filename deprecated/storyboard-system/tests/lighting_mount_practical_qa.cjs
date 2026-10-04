// 验证：附件按灯头接口(mount)过滤 + 逻辑光 practical 可见且不画光束
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');

const addByText = async (page, re) => {
  return page.evaluate(src => {
    const rx = new RegExp(src, 'i');
    const t = [...document.querySelectorAll('button,[role=button]')]
      .find(n => rx.test(n.textContent || '') && n.offsetParent);
    if (t) { t.click(); return (t.textContent || '').trim().slice(0, 30); }
    return null;
  }, re.source || re);
};

const attachmentOptions = page => page.evaluate(() => {
  const f = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')]
    .find(x => /灯具附件/.test(x.textContent || ''));
  if (!f) return null;
  const sel = f.querySelector('select');
  return {
    label: (f.querySelector('span')?.textContent || '').trim(),
    options: sel ? [...sel.options].map(o => o.textContent.trim()) : null,
    value: sel ? sel.value : null
  };
});

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-mount-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // 1) Bowens 机型：应含反光伞
    console.log('add Bowens:', await addByText(page, /Forza 500B/));
    await page.waitForTimeout(2500);
    const bowens = await attachmentOptions(page);
    console.log('Bowens 机型附件:', JSON.stringify(bowens));
    await page.screenshot({ path: path.join(OUT, 'mount-01-bowens.png') });

    // 2) Spigot 机型：应不含反光伞
    console.log('add Spigot:', await addByText(page, /SkyPanel/));
    await page.waitForTimeout(2500);
    const spigot = await attachmentOptions(page);
    console.log('Spigot 机型附件:', JSON.stringify(spigot));
    await page.screenshot({ path: path.join(OUT, 'mount-02-spigot.png') });

    // 3) 逻辑光 practical
    console.log('add practical:', await addByText(page, /实景灯|Practical/));
    await page.waitForTimeout(3000);
    const practical = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      let info = null;
      if (rt && rt.equipmentMap && rt.equipmentMap.size) {
        rt.equipmentMap.forEach(e => {
          if (/实景灯|Practical/i.test(e.label || '')) {
            let hasBeam = false;
            e.group.traverse(o => { if (o.name === 'beam-volume') hasBeam = true; });
            info = { label: e.label, hasBeam, meshes: e.meshCount };
          }
        });
      }
      return { runtimeEntries: rt ? rt.equipmentMap.size : 0, practical: info };
    });
    console.log('逻辑光:', JSON.stringify(practical));
    await page.screenshot({ path: path.join(OUT, 'mount-03-practical.png') });

    // 判定
    const bowensHasUmbrella = bowens && bowens.options && bowens.options.some(o => /反光伞/.test(o));
    const spigotNoUmbrella = spigot && spigot.options && !spigot.options.some(o => /反光伞/.test(o));
    console.log('---');
    console.log('Bowens 含反光伞:', bowensHasUmbrella);
    console.log('Spigot 排除反光伞:', spigotNoUmbrella);
    console.log('逻辑光无光束(应为 true):', practical.practical ? !practical.practical.hasBeam : 'n/a');

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('pageerrors:', errs.length ? [...new Set(errs)].join(' | ') : '(none)');
    await browser.close();
  }
})();
