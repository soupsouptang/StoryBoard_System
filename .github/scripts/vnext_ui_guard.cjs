const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const requireFromLegacy = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = requireFromLegacy('playwright');

const base = process.env.FRAMEFORGE_VNEXT_BASE || 'http://127.0.0.1:3000';
const out = path.resolve(process.cwd(), '..', 'qa-artifacts', 'vnext-ui');
fs.mkdirSync(out, { recursive: true });

const viewports = [
  { width: 1440, height: 1000 },
  { width: 1024, height: 800 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
  { width: 320, height: 568 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push('pageerror: ' + error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push('console: ' + message.text());
      });

      await page.goto(base + '/login', { waitUntil: 'networkidle' });
      await page.screenshot({
        path: path.join(out, `login-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const focusables = [...document.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )];
        const outside = focusables
          .map(el => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          })
          .filter(r => r.right > window.innerWidth + 1 || r.left < -1);
        return {
          viewportWidth: window.innerWidth,
          scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
          outside,
          inputs: document.querySelectorAll('input').length,
          buttons: document.querySelectorAll('button').length,
        };
      });

      if (metrics.scrollWidth > metrics.viewportWidth + 1) {
        failures.push(`${viewport.width}px: horizontal overflow ${metrics.scrollWidth} > ${metrics.viewportWidth}`);
      }
      if (metrics.outside.length) {
        failures.push(`${viewport.width}px: interactive controls outside viewport: ${JSON.stringify(metrics.outside)}`);
      }
      if (metrics.inputs < 2 || metrics.buttons < 4) {
        failures.push(`${viewport.width}px: login controls missing`);
      }

      await page.locator('body').click({ position: { x: 2, y: Math.min(2, viewport.height - 1) } });
      await page.keyboard.press('Tab');
      const firstFocus = await page.evaluate(() => document.activeElement?.tagName || '');
      if (!['BUTTON', 'INPUT'].includes(firstFocus)) {
        failures.push(`${viewport.width}px: keyboard focus did not enter an interactive control`);
      }

      const languageButton = page.getByRole('button', { name: /Switch to English|切换为中文/ });
      await languageButton.click();
      await page.waitForTimeout(100);
      const languageStillPresent = await page.getByRole('button', { name: /Switch to English|切换为中文/ }).count();
      if (!languageStillPresent) failures.push(`${viewport.width}px: locale control disappeared after toggle`);

      const themeButton = page.getByRole('button', { name: /Switch to light theme|Switch to dark theme/ });
      await themeButton.click();
      await page.waitForTimeout(100);

      const registerButton = page.getByRole('button', { name: /注册|Register Account/ }).first();
      await registerButton.click();
      await page.waitForTimeout(100);
      const registerInputCount = await page.locator('input').count();
      if (registerInputCount < 3) failures.push(`${viewport.width}px: register mode did not expose expected form fields`);

      await page.close();

      if (errors.length) {
        failures.push(`${viewport.width}px browser errors:\n${errors.join('\n')}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('VNext UI guard FAILED');
    for (const failure of failures) console.error(' - ' + failure);
    process.exitCode = 1;
  } else {
    console.log('PASS: VNext login rendered and remained usable at 1440/1024/768/375/320');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
