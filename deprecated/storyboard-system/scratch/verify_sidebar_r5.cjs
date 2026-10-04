// 验证 R5 §5：未选项目时 Sidebar 仍显示全部模块，点击后主区给 Empty State
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/sidebar-r5');
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
    await page.waitForTimeout(1500);

    // 未选项目状态：统计侧栏模块与分组
    const before = await page.evaluate(() => ({
      items: [...document.querySelectorAll('#appSidebar .ff73-nav-item, #appSidebar .nav-item')].map(n => n.textContent.trim()),
      groups: [...document.querySelectorAll('#appSidebar .ff73-nav-group > span, #appSidebar .nav-section-label')].map(n => n.textContent.trim()),
      hasProject: !document.querySelector('#projectWorkView.hidden')
    }));
    console.log('未选项目 —— 侧栏模块数:', before.items.length);
    console.log('  分组:', JSON.stringify(before.groups));
    console.log('  模块:', JSON.stringify(before.items));

    // 点「灯光平面图」
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('#appSidebar .ff73-nav-item, #appSidebar .nav-item')].find(x => /灯光平面图/.test(x.textContent));
      if (b) b.click();
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 'no-project-empty-state.png') });

    const after = await page.evaluate(() => {
      const main = document.querySelector('#viewContent') || document.body;
      const txt = (main.innerText || '').replace(/\s+/g, ' ').slice(0, 260);
      return {
        moduleStillInSidebar: [...document.querySelectorAll('#appSidebar .ff73-nav-item, #appSidebar .nav-item')].some(x => /灯光平面图/.test(x.textContent)),
        sidebarCount: document.querySelectorAll('#appSidebar .ff73-nav-item, #appSidebar .nav-item').length,
        mainText: txt,
        hasEmptyHint: /请选择|创建项目|尚无|没有项目|选择或创建/.test(txt)
      };
    });
    console.log('点击后:');
    console.log('  模块仍在侧栏:', after.moduleStillInSidebar, '| 侧栏模块数:', after.sidebarCount);
    console.log('  主区提示含 Empty State:', after.hasEmptyHint);
    console.log('  主区文本:', JSON.stringify(after.mainText.slice(0, 160)));
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
