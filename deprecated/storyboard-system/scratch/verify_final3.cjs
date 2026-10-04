// 综合验证：2D 图元体量 / 模型替换 / LOD 距离切换
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/final3');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
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
    await page.fill('#newProjForm [name=name]', 'qa-final-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    for (const t of ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'ARRI Orbiter']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')].find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(600);
    }

    // === 1. 2D 图元体量 ===
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(1800);
    const s2d = await page.evaluate(() => {
      const svg = document.querySelector('.ff-boards-item svg');
      return { size: svg ? Math.round(svg.getBoundingClientRect().width) : null, bg: getComputedStyle(document.querySelector('.ff-boards-viewport')).backgroundColor };
    });
    console.log('[1] 2D 图元屏幕尺寸:', s2d.size, 'px (目标 76) | viewport 背景:', s2d.bg);
    await page.screenshot({ path: path.join(OUT, '1-2d-icons.png') });

    // === 2. 模型替换 ===
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '3D');
      if (b) b.click();
    });
    await page.waitForTimeout(2500);
    // 选中第一个器材（点它的 DOM item）
    await page.evaluate(() => {
      const n = document.querySelector('.ff-boards-item');
      if (n) { n.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 })); n.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1 })); }
    });
    await page.waitForTimeout(1500);
    const beforeSwap = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].find(x => /替换型号/.test(x.textContent || ''));
      const label = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].find(x => /标签/.test(x.textContent || ''));
      const pos = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].filter(x => /^X|Y/.test((x.textContent || '').trim()));
      return {
        hasSelect: !!f,
        options: f ? [...f.querySelectorAll('option')].map(o => o.textContent.trim()).slice(0, 6) : null,
        label: label ? label.querySelector('input')?.value : null,
        xy: pos.map(p => p.querySelector('input')?.value)
      };
    });
    console.log('[2] 替换型号下拉:', beforeSwap.hasSelect, '| 选项:', JSON.stringify(beforeSwap.options));
    console.log('    替换前 标签:', beforeSwap.label, 'X/Y:', JSON.stringify(beforeSwap.xy));
    // 执行替换
    const swapped = await page.evaluate(() => {
      const f = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].find(x => /替换型号/.test(x.textContent || ''));
      const sel = f && f.querySelector('select');
      if (!sel) return null;
      const other = [...sel.options].find(o => o.value !== sel.value);
      if (!other) return null;
      sel.value = other.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return other.textContent.trim();
    });
    await page.waitForTimeout(2000);
    const afterSwap = await page.evaluate(() => {
      const label = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].find(x => /标签/.test(x.textContent || ''));
      const pos = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')].filter(x => /^X|Y/.test((x.textContent || '').trim()));
      return { label: label ? label.querySelector('input')?.value : null, xy: pos.map(p => p.querySelector('input')?.value) };
    });
    console.log('    替换为:', swapped, '| 替换后 标签:', afterSwap.label, 'X/Y:', JSON.stringify(afterSwap.xy));
    console.log('    位置保持:', JSON.stringify(beforeSwap.xy) === JSON.stringify(afterSwap.xy));
    await page.screenshot({ path: path.join(OUT, '2-swap.png') });

    // === 3. LOD ===
    const lodNear = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      const out = [];
      rt.equipmentMap.forEach(e => out.push({ label: e.label, glbVisible: e.glbMesh ? e.glbMesh.visible : null, procVisible: e.procedural ? e.procedural.visible : null, lod: e.lodState }));
      return { radius: Math.round(rt.orbit.radius), items: out, switches: rt.stats.lodSwitches || 0 };
    });
    console.log('[3] 近距离: radius=', lodNear.radius, 'switches=', lodNear.switches);
    lodNear.items.forEach(i => console.log(`    ${i.label}: glb=${i.glbVisible} proc=${i.procVisible} lod=${i.lod}`));
    // 拉远相机
    await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      rt.orbit.radius = 5000; rt.applyOrbit(); rt.render();
    });
    await page.waitForTimeout(1500);
    const lodFar = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      const out = [];
      rt.equipmentMap.forEach(e => out.push({ label: e.label, glbVisible: e.glbMesh ? e.glbMesh.visible : null, procVisible: e.procedural ? e.procedural.visible : null, lod: e.lodState }));
      return { radius: Math.round(rt.orbit.radius), items: out, switches: rt.stats.lodSwitches || 0 };
    });
    console.log('    远距离: radius=', lodFar.radius, 'switches=', lodFar.switches, '(应 > 0)');
    lodFar.items.forEach(i => console.log(`    ${i.label}: glb=${i.glbVisible} proc=${i.procVisible} lod=${i.lod}`));
    await page.screenshot({ path: path.join(OUT, '3-lod-far.png') });

  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 5).join(' | ') : '(none)'); await browser.close(); }
})();
