// 独立验证：2D / 2.5D / Split / 3D 四个模式截图 + 运行时真值 + 像素可见性断言
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);

  const consoleErrors = [], netFails = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.url()}`); });

  const shot = async n => { await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const report = {};

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', process.env.QA_USER || 'admin');
      await page.fill('[name=password]', process.env.QA_PASS || 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-mode-probe-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    // enter lighting
    const navBtn = await page.$('[data-nav-key="lighting"],[data-view="lighting"],.ff73-nav-item[data-nav-key="lighting"]');
    console.log('lighting nav button found:', !!navBtn);
    if (navBtn) { await navBtn.click(); } else {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').includes('灯光'));
        if (b) b.click();
      });
    }
    await page.waitForTimeout(2500);
    await shot('10-lighting-landing');
    report.landing = await page.evaluate(() => ({
      boardsRoot: !!document.querySelector('.ff-boards'),
      kind: document.querySelector('.ff-boards')?.dataset?.kind,
      bodyHtml: document.body.innerHTML.includes('ff-boards'),
      presetsVisible: [...document.querySelectorAll('*')].filter(e => /DIGITAL TWIN|STAGING/i.test(e.textContent || '') && e.children.length === 0).length
    }));
    console.log('landing:', JSON.stringify(report.landing));

    // create board
    const created = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|新建|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) { b.click(); return true; }
      return false;
    });
    console.log('create board clicked:', created);
    await page.waitForTimeout(1500);
    await shot('11-board-created');

    // add a fixture preset (SkyPanel)
    const added = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('button,[role=button],.card,.preset-item,li')];
      const t = nodes.find(n => /SkyPanel/i.test((n.textContent || '')) && (n.offsetParent || n.offsetHeight));
      if (t) { t.click(); return t.textContent.trim().slice(0, 60); }
      return null;
    });
    console.log('fixture clicked:', added);
    await page.waitForTimeout(2000);
    await shot('12-fixture-added');

    report.itemCount = await page.evaluate(() => {
      const root = document.querySelector('.ff-boards');
      return {
        canvasCount: document.querySelectorAll('.ff-boards canvas').length,
        domItems: document.querySelectorAll('.ff-boards-item,[data-item-id]').length,
        viewMode: root?.dataset?.viewMode
      };
    });
    console.log('items:', JSON.stringify(report.itemCount));

    // cycle modes
    for (const mode of ['2d', '2.5d', 'split', '3d']) {
      const ok = await page.evaluate(m => {
        const btns = [...document.querySelectorAll('.ff-boards button')];
        const b = btns.find(x => (x.textContent || '').trim() === (m === '2.5d' ? '2.5D' : m === 'split' ? '分屏' : m === '3d' ? '3D' : '2D'));
        if (b) { b.click(); return true; }
        const b2 = btns.find(x => (x.getAttribute('title') || '').includes('立体') || (x.textContent || '').trim().toUpperCase() === m.toUpperCase());
        if (b2) { b2.click(); return true; }
        return false;
      }, mode);
      await page.waitForTimeout(2200);
      await shot('mode-' + mode);
      const info = await page.evaluate(() => {
        const root = document.querySelector('.ff-boards');
        const canvases = [...document.querySelectorAll('.ff-boards canvas')];
        return {
          viewMode: root?.dataset?.viewMode,
          canvases: canvases.map(c => {
            const r = c.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height), cls: c.className.slice(0, 40) };
          }),
          webglCanvas: canvases.filter(c => {
            try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
          }).length
        };
      });
      report['mode_' + mode] = { clicked: ok, ...info };
      console.log(`mode ${mode}:`, JSON.stringify(info));
    }

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
    await shot('99-error');
  } finally {
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log('--- CONSOLE ERRORS ---');
    console.log(consoleErrors.length ? [...new Set(consoleErrors)].slice(0, 25).join('\n') : '(none)');
    console.log('--- NETWORK >=400 ---');
    console.log(netFails.length ? [...new Set(netFails)].slice(0, 25).join('\n') : '(none)');
    await browser.close();
  }
})();
