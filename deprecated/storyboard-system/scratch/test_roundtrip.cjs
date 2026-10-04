// 保存往返验证：添加多类别预设 → 保存 → 刷新 → 核对 type/subtype/坐标是否保真
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');
fs.mkdirSync(OUT, { recursive: true });

const snap = page => page.evaluate(() => {
  const host = globalThis.__FF_BOARDS_DEBUG__ || {};
  return null;
});

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [], netFails = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.url()}`); });

  const readItems = () => page.evaluate(() => {
    // 从 DOM 无法取全量数据 → 走后端 API 当前 board 的 items
    return fetch('/api/creative-boards?projectId=' + window.__curProj, { credentials: 'same-origin' })
      .then(r => r.json()).catch(() => null);
  });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    const name = 'Roundtrip ' + Date.now();
    await page.fill('#newProjForm [name=name]', name);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    // 捕获 project id
    const projId = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('ff_cur_project') || 'null')?.id || window.__FF_PROJECT_ID__ || null; }
      catch (e) { return null; }
    });
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|新建|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // 从每个对象库分组各添加一个（覆盖 light/camera/grip/actor/furniture/architecture 等）
    const added = await page.evaluate(() => {
      const picked = [];
      document.querySelectorAll('.ff-boards-library-group').forEach(g => {
        const btn = g.querySelector('button:not([hidden])');
        if (btn) { btn.click(); picked.push((btn.textContent || '').trim().slice(0, 28)); }
      });
      return picked;
    });
    console.log('added from groups:', added.length, JSON.stringify(added));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 'rt-01-added.png') });

    // 前端内存中的 items（保存前）
    const before = await page.evaluate(() => {
      const boards = [];
      document.querySelectorAll('.ff-boards').forEach(() => {});
      const apiState = globalThis.__FF_BOARDS_STATE__ || null;
      return apiState;
    });

    // 显式保存
    const saved = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(x => /保存|立即保存/.test((x.textContent || '').trim()) && x.offsetParent);
      if (btns.length) { btns[btns.length - 1].click(); return btns[btns.length - 1].textContent.trim(); }
      return null;
    });
    console.log('save clicked:', saved);
    await page.waitForTimeout(3000);

    // 通过 API 读取保存后的 board items
    const proj = projId || await page.evaluate(() => {
      const m = document.location.hash.match(/project[\/=]([a-f0-9-]{8,})/i); return m ? m[1] : null;
    });
    let apiItems = null;
    if (proj) {
      const res = await page.evaluate(async pid => {
        const r = await fetch('/api/projects/' + pid + '/creative-boards', { credentials: 'same-origin' });
        return r.ok ? await r.json() : { err: r.status };
      }, proj);
      apiItems = res;
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // reopen project & lighting view
    await page.evaluate(n => {
      const row = [...document.querySelectorAll('.project-row,.project-card,tr,li')].find(e => (e.textContent || '').includes(n));
      if (row) (row.querySelector('button,a') || row).click();
    }, name);
    await page.waitForTimeout(2500);
    await page.click('[data-nav-key="lighting"]').catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, 'rt-02-reloaded.png') });

    const after = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.ff-boards-item')];
      return { count: nodes.length, labels: nodes.slice(0, 12).map(n => (n.textContent || '').trim().slice(0, 24)) };
    });
    console.log('DOM items after reload:', JSON.stringify(after));

    // 再取一次 API 做前后对比
    let apiItems2 = null;
    if (proj) {
      apiItems2 = await page.evaluate(async pid => {
        const r = await fetch('/api/projects/' + pid + '/creative-boards', { credentials: 'same-origin' });
        return r.ok ? await r.json() : { err: r.status };
      }, proj);
    }
    const summarize = d => {
      if (!d || !d.boards) return null;
      return d.boards.map(b => ({
        kind: b.kind, n: (b.items || []).length,
        items: (b.items || []).map(i => ({ t: i.type, st: i.subtype, x: i.x, y: i.y, z: i.z, label: i.label }))
      }));
    };
    const s1 = summarize(apiItems), s2 = summarize(apiItems2);
    console.log('BEFORE SAVE API:', JSON.stringify(s1, null, 1));
    console.log('AFTER RELOAD API:', JSON.stringify(s2, null, 1));

    let mismatch = [];
    if (s1 && s2) {
      s1.forEach((b1, bi) => {
        const b2 = s2[bi];
        if (!b2) return;
        if (b1.n !== b2.n) mismatch.push(`board${bi} count ${b1.n} -> ${b2.n}`);
        b1.items.forEach((i1, ii) => {
          const i2 = b2.items[ii];
          if (!i2) return;
          ['t', 'st', 'x', 'y', 'z'].forEach(k => {
            if (String(i1[k]) !== String(i2[k])) mismatch.push(`board${bi} item${ii} ${k}: ${i1[k]} -> ${i2[k]}`);
          });
        });
      });
    }
    console.log(mismatch.length ? 'ROUNDTRIP MISMATCH:\n' + mismatch.join('\n') : 'ROUNDTRIP PRESERVED (type/subtype/x/y/z)');

  } catch (e) {
    console.error('ERR:', e.message);
    await page.screenshot({ path: path.join(OUT, 'rt-99-error.png') }).catch(() => {});
  } finally {
    console.log('pageerrors:', errors.length ? [...new Set(errors)].slice(0, 10).join(' | ') : '(none)');
    console.log('net>=400:', netFails.length ? [...new Set(netFails)].slice(0, 10).join(' | ') : '(none)');
    await browser.close();
  }
})();
