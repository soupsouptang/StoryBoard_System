/**
 * lighting_workspace_v8_qa.cjs
 * Timeouts: GLOBAL=120s, STEP=15s, NAV=8s
 */
'use strict';
const fs = require('fs');
const path = require('path');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (_) {
  try {
    const { chromium } = require('playwright');
    puppeteer = {
      launch: async (opts) => {
        const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
        const browser = await chromium.launch({ headless: true, ...(edge ? { executablePath: edge } : {}) });
        const origNewPage = browser.newPage.bind(browser);
        browser.newPage = async () => {
          const page = await origNewPage();
          page.setViewport = ({ width, height }) => page.setViewportSize({ width, height });
          const origGoto = page.goto.bind(page);
          page.goto = (url, opts = {}) => {
            if (opts.waitUntil === 'networkidle2') opts.waitUntil = 'networkidle';
            return origGoto(url, opts);
          };
          page.type = (sel, text) => page.fill(sel, text);
          return page;
        };
        return browser;
      }
    };
  } catch (err) {
    console.error('Neither puppeteer nor playwright found:', err);
    process.exit(1);
  }
}

const BASE_URL = process.env.QA_URL  || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');
const ADMIN    = process.env.QA_USER || 'admin';
const PASS     = process.env.QA_PASS || 'FrameForge2026!Admin';
const OUT_DIR  = path.join(__dirname, '../qa-artifacts/v8-lighting');
const GLOBAL_T = 120_000, STEP_T = 15_000, NAV_T = 8_000;

fs.mkdirSync(OUT_DIR, { recursive: true });
const gTimer = setTimeout(() => { console.error('[QA] GLOBAL TIMEOUT'); process.exit(1); }, GLOBAL_T);
gTimer.unref?.();

let si = 0, ok = 0, fail = 0;
const log  = m => console.log('[' + String(++si).padStart(2,'0') + '] ' + m);
const errr = m => console.error('[' + String(si).padStart(2,'0') + '] FAIL: ' + m);

async function step(name, fn) {
  const start = Date.now();
  try {
    await Promise.race([fn(), new Promise((_,r) => setTimeout(() => r(new Error('TIMEOUT')), STEP_T))]);
    log('OK ' + name + ' (' + (Date.now()-start) + 'ms)'); ok++; return true;
  } catch(e) { errr(name + ': ' + e.message); fail++; return false; }
}
async function shot(page, name) {
  const f = path.join(OUT_DIR, String(si).padStart(2,'0')+'_'+name+'.png');
  await page.screenshot({path:f,fullPage:false}); log('  shot: '+path.basename(f)); return f;
}

(async () => {
  let browser, page;
  try {
    browser = await puppeteer.launch({headless:'new',args:['--no-sandbox','--disable-dev-shm-usage'],timeout:NAV_T});
    page = await browser.newPage();
    await page.setViewport({width:1440,height:900});
    page.setDefaultTimeout(STEP_T); page.setDefaultNavigationTimeout(NAV_T);
    const errs = []; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>m.type()==='error'&&errs.push(m.text()));
    page.on('response', async res => {
      if (res.status() >= 400) {
        let text = '';
        try { text = await res.text(); } catch(_) {}
        console.error('FAILED REQUEST:', res.request().method(), res.url(), res.status(), text);
        console.error('REQUEST PAYLOAD:', res.request().postData());
      }
    });

    await step('Login page', async () => {
      await page.goto(BASE_URL, {waitUntil:'networkidle2',timeout:NAV_T});
      await page.waitForSelector('#loginForm:not(.hidden), #appView:not(.hidden), #loginView:not(.hidden)', {timeout:STEP_T});
    });
    await step('Do login', async () => {
      const loginVisible = await page.evaluate(() => {
        const lv = document.querySelector('#loginView');
        return lv && !lv.classList.contains('hidden');
      });
      if (!loginVisible) return;
      await page.type('#loginUsername', ADMIN); await page.type('#loginPassword', PASS);
      await page.click('#loginSubmitBtn');
      await page.waitForSelector('#appView:not(.hidden)',{timeout:STEP_T});
    });
    await shot(page,'01_dashboard');

    await step('Open/create project', async () => {
      await page.waitForSelector('#projectGrid, .project-row, #dashNewProjectBtn', {timeout:STEP_T});
      await new Promise(r => setTimeout(r, 400));
      const row = await page.$('.project-row');
      if (row) await row.click(); else { await page.click('#dashNewProjectBtn'); await new Promise(r=>setTimeout(r,400)); }
      await page.waitForSelector('[data-nav-key],[data-view]',{timeout:STEP_T});
    });
    await step('Go to lighting workspace', async () => {
      const btn = await page.$('[data-nav-key="lighting"],[data-view="lighting"]');
      if (btn) await btn.click(); else { const items = await page.$$('[data-nav-key]'); if (items.length) await items[items.length-1].click(); }
      await page.waitForSelector('.ff-boards[data-kind="lighting"],.ff-boards',{timeout:STEP_T});
    });
    await shot(page,'02_lighting_workspace');

    await step('FrameForgeLightingScene.getPresets', async () => {
      const r = await page.evaluate(() => {
        const LS = globalThis.FrameForgeLightingScene;
        if (!LS) return {ok:false,e:'not found'};
        const p = LS.getPresets && LS.getPresets('light');
        if (!p || !p.length) return {ok:false,e:'empty'};
        return {ok:true,n:p.length};
      });
      if (!r.ok) throw new Error(r.e);
      log('  light presets count: '+r.n);
    });

    await step('Create board', async () => {
      await page.evaluate(() => {
        const sel = document.querySelector('.ff-boards-toolbar select');
        if (sel && sel.value && sel.value !== '') return; // board already selected
        const btns = [...document.querySelectorAll('[data-action="create-board"]')];
        const btn = btns.find(b => !b.disabled);
        if (btn) {
          const details = btn.closest('details');
          if (details) details.open = true;
          btn.click();
        }
      });
      await new Promise(r=>setTimeout(r,800));
    });
    await step('Preset tiles visible', async () => {
      const tiles = await page.$$('.ff-boards-tiles > button,.ff-boards-palette button');
      if (tiles.length < 3) throw new Error('Only '+tiles.length+' tiles');
      log('  '+tiles.length+' tiles');
    });
    await shot(page,'03_preset_palette');

    await step('Add first preset item', async () => {
      const tiles = await page.$$('.ff-boards-tiles>button:not([disabled]),.ff-boards-palette button:not([disabled])');
      if (!tiles.length) throw new Error('No enabled tiles');
      await tiles[0].click(); await new Promise(r=>setTimeout(r,400));
      const items = await page.$$('.ff-boards-item');
      if (!items.length) throw new Error('No items after add');
    });
    await shot(page,'04_board_item');

    const switchMode = async (label) => {
      await page.evaluate(lbl => {
        const btns = [...document.querySelectorAll('.ff-boards-view-modes button')];
        const b = btns.find(b=>b.textContent.trim()===lbl); if(b)b.click();
      }, label);
      await new Promise(r=>setTimeout(r,450));
    };

    await step('2D mode', () => switchMode('2D')); await shot(page,'05_2d');
    await step('2.5D mode', async () => {
      await switchMode('2.5D');
      const cv = await page.$('.ff-boards-25d-canvas');
      if (!cv) throw new Error('no 2.5D canvas');
    }); await shot(page,'06_2_5d');
    await step('Split mode', async () => {
      await switchMode('分屏');
      await page.waitForSelector('.ff-boards-split-left',{timeout:STEP_T});
    }); await shot(page,'07_split');
    await step('3D mode', () => switchMode('3D')); await shot(page,'08_3d');

    await step('No critical JS errors', async () => {
      const rel = errs.filter(e=>!e.includes('favicon')&&!e.includes('net::ERR'));
      if (rel.length) throw new Error(rel.slice(0,2).join(' | '));
    });

    console.log('\n[QA] '+ok+'/'+(ok+fail)+' passed, '+fail+' failed');
    console.log('[QA] Artifacts: '+OUT_DIR);
  } catch(e) {
    console.error('[QA] Fatal:', e.message); if(page) await shot(page,'fatal').catch(()=>{}); fail++;
  } finally {
    clearTimeout(gTimer); await browser?.close().catch(()=>{}); process.exit(fail>0?1:0);
  }
})();
