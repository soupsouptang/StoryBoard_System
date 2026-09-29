/* Capture deterministic FRAMEFORGE VNext visual snapshots against an isolated runtime. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const playwrightPath = require.resolve('playwright', { paths: [path.join(ROOT, 'storyboard-system')] });
const { chromium } = require(playwrightPath);

const WEB = process.env.FRAMEFORGE_WEB_BASE || 'http://127.0.0.1:3000';
const API = process.env.FRAMEFORGE_API_BASE || 'http://127.0.0.1:8000';
const OUT = path.resolve(process.env.FRAMEFORGE_VISUAL_OUT || path.join(ROOT, 'qa-artifacts', 'visual'));
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
];

async function capture(page, name) {
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  const metrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    },
    body: {
      width: Math.round(document.body.getBoundingClientRect().width),
      height: Math.round(document.body.getBoundingClientRect().height),
    },
  }));
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(metrics, null, 2));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      await page.goto(WEB + '/login', { waitUntil: 'networkidle' });
      await capture(page, vp.name + '-login');

      await page.locator('input[type="email"]').fill('admin@company.internal');
      await page.locator('input[type="password"]').fill('FrameForge2026!Admin');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/productions', { timeout: 15000 });

      const production = await page.evaluate(async (apiBase) => {
        const token = localStorage.getItem('frameforge_token');
        const response = await fetch(apiBase + '/api/v1/productions', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!response.ok) throw new Error('production fetch failed: ' + response.status);
        const items = await response.json();
        return items[0];
      }, API);
      if (!production?.id) throw new Error('seeded production missing');

      await page.goto(WEB + '/production/' + encodeURIComponent(production.id) + '/shots', { waitUntil: 'networkidle' });
      await page.getByRole('region', { name: '镜头制作表' }).waitFor({ state: 'visible', timeout: 15000 });
      await capture(page, vp.name + '-shots');

      await page.goto(WEB + '/production/' + encodeURIComponent(production.id) + '/deliverables', { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: '交付与导出' }).waitFor({ state: 'visible', timeout: 10000 });
      await capture(page, vp.name + '-deliverables');

      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log('PASS: visual snapshots captured in ' + OUT);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
