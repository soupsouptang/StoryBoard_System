// 验证 2D 矢量插画风格：白底 / 光束实心填充 / 标签带规格
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/vector-2d');
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'ARRI Orbiter', 'Avenger C-Stand', '主演演员', '剧组长桌', '摄影机'];

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().split('/').pop()}`); });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-vector2d-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // 切 2D
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    for (const t of TARGETS) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')]
          .find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, '2d-vector.png') });

    const check = await page.evaluate(() => {
      const cv = document.querySelector('.ff-boards-canvas');
      const cs = cv ? getComputedStyle(cv) : null;
      const cones = [...document.querySelectorAll('.ff-boards-coverage path')];
      const labels = [...document.querySelectorAll('.ff-boards-item-label')];
      return {
        viewMode: document.querySelector('.ff-boards')?.dataset?.viewMode,
        canvasBg: cs ? cs.backgroundColor : null,
        canvasBgImage: cs ? (cs.backgroundImage || '').slice(0, 60) : null,
        beamCount: cones.length,
        beamSample: cones[0] ? {
          fill: cones[0].getAttribute('fill'),
          fillOpacity: cones[0].getAttribute('fill-opacity'),
          dash: cones[0].getAttribute('stroke-dasharray')
        } : null,
        labelCount: labels.length,
        labelSample: labels[0] ? labels[0].textContent.trim() : null,
        specLineCount: document.querySelectorAll('.ff-boards-item-label .ff-label-spec').length,
        itemCount: document.querySelectorAll('.ff-boards-item').length,
        // 前 6 个图元的 path 起始片段 —— 用于确认用的是侧视图元而非俯视符号
        pathHeads: [...document.querySelectorAll('.ff-boards-item svg path')].slice(0, 6).map(p =>
          (p.getAttribute('d') || '').slice(0, 22))
      };
    });
    console.log(JSON.stringify(check, null, 1));

    // 判定
    const okBg = check.canvasBg === 'rgb(255, 255, 255)';
    const okBeam = check.beamSample && check.beamSample.fill === 'currentColor' && Number(check.beamSample.fillOpacity) > 0.05 && !check.beamSample.dash;
    console.log('\n判定：');
    console.log('  白底纸面        :', okBg, check.canvasBg);
    console.log('  光束半透明实心  :', okBeam, JSON.stringify(check.beamSample));
    console.log('  标签含规格行    :', check.specLineCount > 0, `${check.specLineCount}/${check.labelCount}`);
    console.log('  示例标签        :', JSON.stringify(check.labelSample));
    console.log('  图元数量        :', check.itemCount);

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 6).join(' | ') : '(none)');
    await browser.close();
  }
})();
