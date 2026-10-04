const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'qa-artifacts', 'material-m3');
const dataRoot = path.join(root, '.qa-data', 'material-m3');
const base = (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const result = await fetch(`${base}/api/session`);
      if (result.ok) return;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('QA server did not start');
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(dataRoot, { recursive: true });
  const server = spawn('py', ['-3', '-c', 'import server; server.run_server(18765)'], {
    cwd: root,
    env: {
      ...process.env,
      STORYBOARD_DATA_ROOT: dataRoot,
      STORYBOARD_ADMIN_USER: 'qa-admin',
      STORYBOARD_ADMIN_PASSWORD: 'QA-Password-Only-2026!'
    },
    stdio: 'pipe',
    windowsHide: true
  });
  let browser;
  const consoleErrors = [];
  const failedRequests = [];
  const overflow = {};
  const importRequests = [];
  try {
    await waitForServer();
    browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(12000);
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
    page.on('request', request => {
      if (/\/import-(preview|commit)/.test(request.url())) importRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });

    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.locator('#loginForm md-filled-button').click();
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.screenshot({ path: path.join(out, '01-projects-1440.png'), fullPage: true });

    await page.locator('#dashNewProjectBtn').click();
    await page.fill('#newProjForm [name=name]', 'qa-material-3-tvc');
    await page.selectOption('#newProjForm [name=production_type]', 'tvc');
    await page.fill('#newProjForm [name=target_seconds]', '30');
    await page.locator('#newProjForm [type=submit]').click();
    await page.waitForSelector('#projectWorkView:not(.hidden)');
    if (await page.locator('body').getAttribute('data-ui-mode') !== 'simple') throw new Error('默认 UI 模式不是精简模式');
    if (await page.locator('[data-tab=review]').isVisible()) throw new Error('精简模式仍展示审片与版本功能');
    if (await page.locator('#globalPresenceStack').isVisible()) throw new Error('精简模式仍展示协作状态');
    await page.screenshot({ path: path.join(out, '02-simple-1440.png'), fullPage: true });

    await page.locator('#uiModeToggle').click();
    if (await page.locator('body').getAttribute('data-ui-mode') !== 'professional') throw new Error('未切换到专业模式');
    if (!await page.locator('[data-tab=review]').isVisible()) throw new Error('专业模式未恢复审片与版本功能');
    if (await page.locator('#globalPresenceStack').evaluate(el => getComputedStyle(el).display === 'none')) throw new Error('专业模式未恢复协作状态');
    await page.screenshot({ path: path.join(out, '03-professional-1440.png'), fullPage: true });
    await page.locator('#uiModeToggle').click();

    await page.locator('[data-tab=board]').click();
    await page.waitForSelector('#viewBoard:not(.hidden)');
    await page.locator('#addShotActionBtn').click();
    await page.fill('#inspDescription', '产品在黑色镜面上旋转，硬光扫过金属边缘。');
    await page.fill('#inspVoiceover', '每一次突破，都来自对细节的坚持。');
    await page.locator('#autoTimingActionBtn').click();
    await page.waitForTimeout(250);
    await page.locator('#saveProjectBtn').click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, '04-board-1440.png'), fullPage: true });

    await page.locator('[data-tab=table]').click();
    await page.waitForSelector('#viewTable:not(.hidden)');
    await page.screenshot({ path: path.join(out, '05-table-1440.png'), fullPage: true });
    overflow.desktop = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

    const csv = Buffer.from('镜号,标题,画面描述,旁白,时长,制作方式\n010,CSV 导入镜头,云台推进产品细节,细节决定品质,2.5,LIVE\n', 'utf8');
    await page.locator('#importFileInput').setInputFiles({ name: 'qa-import.csv', mimeType: 'text/csv', buffer: csv });
    await page.waitForSelector('#importModal[open]');
    const titleMapping = page.locator('#mappingPreviewBox select[data-field=title]');
    await titleMapping.selectOption('-1');
    await titleMapping.selectOption('1');
    const commitResponse = page.waitForResponse(response => response.url().includes('/import-commit') && response.request().method() === 'POST');
    await page.locator('#commitImportBtn').click();
    const importResult = await (await commitResponse).json();
    await page.locator('#importModal:not([open])').waitFor({ state: 'hidden' });
    if (importResult.imported !== 1) throw new Error(`CSV 导入数量错误：${importResult.imported}`);
    const importedTitlePresent = await page.locator('#tableScrollWrap input[data-field=title]').evaluateAll(inputs => inputs.some(input => input.value === 'CSV 导入镜头'));
    if (!importedTitlePresent) {
      const importedTitles = await page.locator('#tableScrollWrap input[data-field=title]').evaluateAll(inputs => inputs.map(input => input.value));
      throw new Error(`CSV 导入后未找到新增镜头：${importedTitles.join(', ')}`);
    }
    if (!importRequests.some(request => request.includes('import-preview')) || !importRequests.some(request => request.includes('import-commit'))) {
      throw new Error(`CSV 未完整经过 import-preview → import-commit：${importRequests.join(', ')}`);
    }

    for (const [layout, title] of [['table', '分镜执行表'], ['board', '九宫格故事板'], ['detail', '单镜详细版']]) {
      await page.locator('#pdfExportQuickBtn').click();
      await page.locator(`input[name=pdfLayout][value=${layout}]`).check();
      const popupPromise = page.waitForEvent('popup');
      await page.locator('#openPdfDocumentBtn').click();
      const printDocument = await popupPromise;
      await printDocument.waitForSelector('h1');
      if (!(await printDocument.title()).includes(title)) throw new Error(`PDF ${title} 未在独立文档中生成`);
      if (!await printDocument.locator('.toolbar button').isVisible()) throw new Error(`PDF ${title} 缺少打印按钮`);
      await printDocument.close();
    }

    await page.locator('#uiModeToggle').click();

    await page.locator('#projectShareBtn').click();
    await page.locator('#genShareBtn').click();
    await page.waitForSelector('#copyShareBtn');
    const shareUrl = await page.locator('#shareLinkContainer input').inputValue();
    const share = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    share.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    share.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
    await share.goto(shareUrl, { waitUntil: 'networkidle' });
    await share.waitForSelector('#shareCardsGrid');
    const downloadHref = await share.getByRole('link', { name: '下载完整项目包' }).getAttribute('href');
    const download = await share.request.get(`${base}${downloadHref}`);
    if (!download.ok()) throw new Error(`ZIP download returned ${download.status()}`);
    overflow.share = await share.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.locator('[data-close=shareDialogModal]').click();
    await page.locator('#uiModeToggle').click();

    const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
    mobile.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    mobile.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
    await mobile.goto(`${base}/`, { waitUntil: 'networkidle' });
    await mobile.screenshot({ path: path.join(out, '06-login-375.png'), fullPage: true });
    overflow.loginMobile = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await mobile.fill('[name=username]', 'qa-admin');
    await mobile.fill('[name=password]', 'QA-Password-Only-2026!');
    await mobile.locator('#loginForm md-filled-button').click();
    await mobile.waitForSelector('#dashboardView:not(.hidden)');
    await mobile.locator('.project-card-item').first().click();
    await mobile.waitForSelector('#projectWorkView:not(.hidden)');
    await mobile.locator('[data-tab=board]').click();
    await mobile.screenshot({ path: path.join(out, '07-workspace-375.png'), fullPage: true });
    overflow.workspaceMobile = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow.mobileActionOverlap = await mobile.evaluate(() => {
      const boxes = [...document.querySelectorAll('.sub-header-right > *')]
        .filter(el => getComputedStyle(el).display !== 'none')
        .map(el => el.getBoundingClientRect());
      return boxes.some((a, i) => boxes.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
    });

    const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    tablet.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await tablet.goto(`${base}/`, { waitUntil: 'networkidle' });
    await tablet.screenshot({ path: path.join(out, '08-login-768.png'), fullPage: true });
    overflow.tablet = await tablet.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await tablet.close();

    const report = { consoleErrors, failedRequests, overflow, importRequests, shareUrl, downloadStatus: download.status() };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (consoleErrors.length || failedRequests.length || Object.values(overflow).some(Boolean)) process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exit(2); });
