// 精准定位：遍历所有样式表，找出真正匹配目标元素的 height 规则及其来源
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-r14-probe-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(2000);

    const r = await page.evaluate(() => {
      const out = {};

      // 1) 找到第一个 .ffui-button，列出所有命中它的规则里含 height 的
      const btn = document.querySelector('.ffui-button');
      out.button = { cls: btn ? btn.className : null, computed: btn ? getComputedStyle(btn).height : null, rules: [] };
      const thead = document.querySelector('#mainShotTable thead');
      const th = thead ? (thead.querySelector('th') || thead.querySelector('tr')) : null;
      out.tableHead = { tag: th ? th.tagName : null, cls: th ? th.className : null, computed: th ? getComputedStyle(th).height : null, rules: [] };

      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (e) { continue; }   // 跨域跳过
        const href = (sheet.href || 'inline').split('/').pop();
        for (const rule of rules) {
          if (rule.type !== 1) continue;                          // 只看 style rules
          const sel = rule.selectorText || '';
          const css = rule.style ? rule.style.cssText : '';
          if (!/height/.test(css)) continue;
          const h = rule.style.height || rule.style.minHeight || '';
          if (!h) continue;
          // 针对按钮
          if (btn && sel.includes('ffui-button')) {
            let hit = false;
            try { hit = btn.matches(sel); } catch (e) { }
            if (hit) out.button.rules.push({ href, sel: sel.slice(0, 90), height: rule.style.height || '-', minHeight: rule.style.minHeight || '-' });
          }
          // 针对表头
          if (th && /thead|shot-table|table/.test(sel)) {
            let hit = false;
            try { hit = th.matches(sel) || (thead && thead.matches(sel)); } catch (e) { }
            if (hit) out.tableHead.rules.push({ href, sel: sel.slice(0, 90), height: rule.style.height || '-', minHeight: rule.style.minHeight || '-' });
          }
        }
      }
      return out;
    });

    console.log('=== .ffui-button ===');
    console.log('  实际类名:', r.button.cls);
    console.log('  computed height:', r.button.computed);
    r.button.rules.forEach(x => console.log(`    [${x.href}] ${x.sel}  height=${x.height} min=${x.minHeight}`));
    console.log('\n=== 表头 ===');
    console.log('  元素:', r.tableHead.tag, '| class:', r.tableHead.cls);
    console.log('  computed height:', r.tableHead.computed);
    r.tableHead.rules.slice(0, 8).forEach(x => console.log(`    [${x.href}] ${x.sel}  height=${x.height} min=${x.minHeight}`));
  } catch (e) { console.error('ERR:', e.message); }
  finally { await browser.close(); }
})();
