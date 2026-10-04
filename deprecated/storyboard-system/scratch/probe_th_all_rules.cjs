// 列出所有命中 thead th 的规则（不过滤属性），锁定 32px 来源
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
    await page.fill('#newProjForm [name=name]', 'qa-thrule-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(2500);

    const r = await page.evaluate(() => {
      const th = document.querySelector('#mainShotTable thead th');
      const tr = document.querySelector('#mainShotTable thead tr');
      const thead = document.querySelector('#mainShotTable thead');
      if (!th) return { err: 'no th' };
      const hitTh = [], hitTr = [], hitThead = [];
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
        const src = (sheet.href || 'inline').split('/').pop();
        for (const rule of rules) {
          if (rule.type !== 1) continue;
          const sel = rule.selectorText || '';
          const css = rule.style.cssText || '';
          const probe = (el, bucket) => {
            if (!el) return;
            let m = false; try { m = el.matches(sel); } catch (e) { }
            if (m) bucket.push(`[${src}] ${sel}  {${css.slice(0, 110)}}`);
          };
          probe(th, hitTh); probe(tr, hitTr); probe(thead, hitThead);
        }
      }
      return {
        th: { computed: getComputedStyle(th).height, rect: Math.round(th.getBoundingClientRect().height), rules: hitTh },
        tr: { computed: getComputedStyle(tr).height, rect: Math.round(tr.getBoundingClientRect().height), rules: hitTr },
        thead: { computed: getComputedStyle(thead).height, rules: hitThead },
        tableStyle: { layout: getComputedStyle(document.querySelector('#mainShotTable')).tableLayout }
      };
    });

    console.log('=== TH (computed', r.th.computed, '/ rect', r.th.rect, ') ===');
    r.th.rules.forEach(x => console.log('  ' + x));
    console.log('=== TR (computed', r.tr.computed, '/ rect', r.tr.rect, ') ===');
    r.tr.rules.forEach(x => console.log('  ' + x));
    console.log('=== THEAD ===');
    r.thead.rules.forEach(x => console.log('  ' + x));
    console.log('=== table-layout:', r.tableStyle.layout, '===');
  } catch (e) { console.error('ERR:', e.message); }
  finally { await browser.close(); }
})();
