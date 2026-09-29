/* Real VNext browser QA: API + Next.js + responsive interaction checks. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const playwrightPath = require.resolve('playwright', { paths: [path.join(ROOT, 'storyboard-system')] });
const { chromium } = require(playwrightPath);

const OUT = path.join(ROOT, 'qa-artifacts', 'vnext-ui');
fs.mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '768', width: 768, height: 900 },
  { name: '375', width: 375, height: 812 },
  { name: '320', width: 320, height: 568 },
];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function noPageOverflow(page, label) {
  const size = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(size.scroll <= size.client + 2, label + ': page-level horizontal overflow ' + size.scroll + ' > ' + size.client);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  try {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: vp.name === '375' ? 'reduce' : 'no-preference',
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push('console: ' + msg.text());
      });

      try {
        await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' });
        await noPageOverflow(page, vp.name + '/login');
        await page.screenshot({ path: path.join(OUT, vp.name + '-login.png'), fullPage: true });

        await page.locator('input[type="email"]').fill('admin@company.internal');
        await page.locator('input[type="password"]').fill('FrameForge2026!Admin');
        await page.locator('button[type="submit"]').click();
        await page.waitForURL('**/productions', { timeout: 15000 });

        const production = await page.evaluate(async () => {
          const token = localStorage.getItem('frameforge_token');
          const response = await fetch('http://127.0.0.1:8000/api/v1/productions', {
            headers: { Authorization: 'Bearer ' + token },
          });
          if (!response.ok) throw new Error('production fetch failed: ' + response.status);
          const items = await response.json();
          return items[0];
        });
        assert(production && production.id, vp.name + ': seeded production missing');

        await page.goto(
          'http://127.0.0.1:3000/production/' + encodeURIComponent(production.id) + '/shots',
          { waitUntil: 'networkidle' }
        );
        const region = page.getByRole('region', { name: '镜头制作表' });
        await region.waitFor({ state: 'visible', timeout: 15000 });
        await noPageOverflow(page, vp.name + '/shots');

        const scroll = await region.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
        assert(scroll.scroll >= scroll.client, vp.name + ': shot table scroll region invalid');

        const firstRow = page.locator('tbody tr').first();

        // Product contract: editable cells consume double-click for inline editing.
        const editableCell = firstRow.locator('[title="双击进行编辑"]').first();
        await editableCell.dblclick();
        const inlineInput = editableCell.locator('input');
        await inlineInput.waitFor({ state: 'visible', timeout: 5000 });
        await inlineInput.press('Escape');
        await inlineInput.waitFor({ state: 'hidden', timeout: 5000 });

        // Product contract: double-clicking a non-inline row area opens the Inspector.
        await firstRow.locator('td').first().dblclick();
        const inspector = page.locator('aside').filter({ hasText: 'SHOT' }).first();
        await inspector.waitFor({ state: 'visible', timeout: 10000 });
        const box = await inspector.boundingBox();
        assert(box, vp.name + ': inspector has no bounding box');
        assert(box.x >= -1 && box.x + box.width <= vp.width + 1, vp.name + ': inspector leaves viewport');
        await page.screenshot({ path: path.join(OUT, vp.name + '-shots-inspector.png'), fullPage: true });
        await page.getByRole('button', { name: '关闭镜头详情' }).click();

        if (vp.name === '375') {
          const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
          assert(reduced, '375: reduced-motion browser preference was not applied');
        }

        await page.goto(
          'http://127.0.0.1:3000/production/' + encodeURIComponent(production.id) + '/deliverables',
          { waitUntil: 'networkidle' }
        );
        await noPageOverflow(page, vp.name + '/deliverables');
        const vttButton = page.getByRole('button', { name: '导出 VTT' });
        await vttButton.waitFor({ state: 'visible', timeout: 10000 });
        assert(!(await vttButton.isDisabled()), vp.name + ': VTT real consumer is disabled');
        const downloadPromise = page.waitForEvent('download');
        await vttButton.click();
        const download = await downloadPromise;
        assert(download.suggestedFilename().toLowerCase().endsWith('.vtt'), vp.name + ': VTT filename contract failed');
        await page.screenshot({ path: path.join(OUT, vp.name + '-deliverables.png'), fullPage: true });

        if (consoleErrors.length) {
          throw new Error(vp.name + ': browser errors:\n' + consoleErrors.join('\n'));
        }
      } catch (error) {
        failures.push(error && error.stack ? error.stack : String(error));
        try {
          await page.screenshot({ path: path.join(OUT, vp.name + '-FAIL.png'), fullPage: true });
        } catch {}
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(failures.join('\n\n'));
    process.exit(1);
  }
  console.log('PASS: VNext browser QA completed for ' + viewports.map(v => v.name).join(', ') + ' px');
})();
