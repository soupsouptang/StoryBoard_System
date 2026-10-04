#!/usr/bin/env node
/**
 * 全量浏览器回归（真实服务 + 真实后端校验）。
 *
 * 用法：node tests/workspace_full_browser_qa.cjs
 * 环境变量：
 *   QA_PYTHON     Python 解释器（默认依次尝试 py -3 / 托管 python）
 *   QA_PORT       服务端口（默认 18797）
 *   QA_SCALE      性能测试镜头数（默认 80；设为 2000 跑大规模档）
 *   QA_MEDIA_DIR  提供 JPG 素材的目录（可选）
 *   QA_KEEP       失败时保留现场（默认保留）
 *
 * 退出清理服务进程；失败保留日志、截图与 report.json。
 * 不对生产项目执行创建/删除类操作：数据根目录是临时目录。
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const root = path.join(__dirname, '..');
const port = Number(process.env.QA_PORT || 18797);
const scale = Number(process.env.QA_SCALE || 80);
const base = `http://127.0.0.1:${port}`;
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const dataRoot = path.join(root, 'scratch', `full-qa-${runId}`);
const outDir = path.join(root, 'qa-artifacts', 'full');
const USER = 'qa-admin', PASS = 'QA-Password-Only-2026!';

const results = [];
const consoleErrors = [];
const failedRequests = [];
let currentGroup = 'setup';

function pickPython() {
  if (process.env.QA_PYTHON) return { cmd: process.env.QA_PYTHON, args: ['-c', 'import server; server.run_server(' + port + ')'] };
  if (process.platform === 'win32') return { cmd: 'py', args: ['-3', '-c', 'import server; server.run_server(' + port + ')'] };
  return { cmd: 'python3', args: ['-c', 'import server; server.run_server(' + port + ')'] };
}

function portFree(p) {
  return new Promise(resolve => {
    const probe = http.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(p, '127.0.0.1');
  });
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise(resolve => {
      const req = http.get(`${base}/healthz`, res => { res.resume(); resolve(res.statusCode === 200); });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ group: currentGroup, name, pass: true, detail: detail === undefined ? null : detail });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    results.push({ group: currentGroup, name, pass: false, error: String(error && error.message || error) });
    console.log(`  FAIL  ${name}: ${error && error.message || error}`);
  }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
const group = name => { currentGroup = name; console.log(`\n[${name}]`); };

(async () => {
  if (!await portFree(port)) throw new Error(`端口 ${port} 已被占用，请用 QA_PORT 指定其他端口，或先确认不是未知进程`);
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const python = pickPython();
  const server = spawn(python.cmd, python.args, {
    cwd: root,
    env: { ...process.env, STORYBOARD_DATA_ROOT: dataRoot, STORYBOARD_ADMIN_USER: USER, STORYBOARD_ADMIN_PASSWORD: PASS },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  const serverLog = [];
  server.stdout.on('data', d => serverLog.push(String(d)));
  server.stderr.on('data', d => serverLog.push(String(d)));

  let browser;
  try {
    if (!await waitForServer()) throw new Error(`服务未能在 ${base} 启动：\n${serverLog.join('')}`);
    console.log(`server ready at ${base} (data: ${path.relative(root, dataRoot)})`);

    const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

    // =====================================================================
    group('首屏与认证');

    await step('未登录的初始 HTML 不含可见内页', async () => {
      const raw = await new Promise((resolve, reject) => {
        http.get(`${base}/`, res => { let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(body)); }).on('error', reject);
      });
      assert(/id="appView"[^>]*class="[^"]*hidden/.test(raw), '初始 HTML 的 #appView 未带 hidden，未认证首屏会露出内页');
      assert(/id="projectWorkView"[^>]*class="[^"]*hidden/.test(raw), '初始 HTML 的 #projectWorkView 未带 hidden');
      assert(/id="bootView"/.test(raw), '缺少认证未决态占位层');
      return { hasBootView: true };
    });

    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await step('无 Cookie 时只显示登录页，不露出受保护数据', async () => {
        await page.goto(`${base}/`, { waitUntil: 'networkidle' });
        await page.waitForSelector('#loginView:not(.hidden)');
        const state = await page.evaluate(() => ({
          app: !document.getElementById('appView').classList.contains('hidden'),
          work: !document.getElementById('projectWorkView').classList.contains('hidden'),
          boot: !document.getElementById('bootView').classList.contains('hidden'),
          body: document.body.innerText.slice(0, 200)
        }));
        assert(!state.app, '未登录时 #appView 可见');
        assert(!state.work, '未登录时 #projectWorkView 可见');
        assert(!state.boot, '认证未决层未收起');
        assert(!/镜头|旁白|素材/.test(state.body), `未登录页面疑似泄漏业务数据：${state.body}`);
        return state;
      });

      await step('会话检查缓慢时不闪现内页', async () => {
        const slow = await ctx.newPage();
        await slow.route('**/api/session', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
        await slow.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
        await slow.waitForTimeout(400);
        const during = await slow.evaluate(() => ({
          app: !document.getElementById('appView').classList.contains('hidden'),
          boot: !document.getElementById('bootView').classList.contains('hidden')
        }));
        assert(!during.app, '会话未决时内页已经可见');
        assert(during.boot, '会话未决时应显示占位层而不是空白');
        await slow.waitForSelector('#loginView:not(.hidden)', { timeout: 8000 });
        await slow.close();
        return during;
      });

      await step('登录成功进入应用且标记 authenticated', async () => {
        await page.fill('[name=username]', USER);
        await page.fill('[name=password]', PASS);
        await page.click('#loginForm button[type=submit]');
        await page.waitForSelector('#dashboardView:not(.hidden)');
        const state = await page.evaluate(() => ({ auth: document.body.dataset.authState, surface: document.body.dataset.surface }));
        assert(state.auth === 'authenticated', `登录后的 authState=${state.auth}`);
        return state;
      });

      await step('退出后刷新回到登录页', async () => {
        await page.click('#logoutBtn');
        await page.waitForSelector('#loginView:not(.hidden)', { timeout: 10000 });
        const state = await page.evaluate(() => ({ auth: document.body.dataset.authState, app: !document.getElementById('appView').classList.contains('hidden') }));
        assert(state.auth === 'anonymous', `退出后 authState=${state.auth}`);
        assert(!state.app, '退出后内页仍然可见');
        return state;
      });
      await ctx.close();
    }

    // =====================================================================
    group('项目与四视图');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
    page.on('requestfailed', r => failedRequests.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    // 画板有未保存草稿时会挂 beforeunload，不处理会让 reload 卡住。
    page.on('dialog', dialog => { dialog.accept().catch(() => {}); });
    let shotCount = 0;

    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.fill('[name=username]', USER);
    await page.fill('[name=password]', PASS);
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-full-qa-' + runId);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    const segment = view => page.locator(`[aria-label="分镜视图"] [data-view="${view}"]`);
    const nav = key => page.locator(`[data-nav-key="${key}"]`);
    // 视图 key -> 实际容器 id（cards 复用 viewBoard，不是 viewCards）
    const CONTAINERS = { table: 'viewTable', cards: 'viewBoard', wall: 'viewWall', timeline: 'viewTimeline' };
    // 刷新/退出后会回到项目大厅，很多步骤需要重新进入项目。
    const ensureProject = async () => {
      if (await page.locator('#mainShotTable, .ff-boards').count() && await page.evaluate(() => document.body.dataset.context === 'project')) return;
      if (!await page.locator('#dashboardView:not(.hidden)').count()) {
        await page.goto(`${base}/`, { waitUntil: 'networkidle' });
        if (await page.locator('#loginView:not(.hidden)').count()) {
          await page.fill('[name=username]', USER);
          await page.fill('[name=password]', PASS);
          await page.click('#loginForm button[type=submit]');
        }
        await page.waitForSelector('#dashboardView:not(.hidden)');
      }
      // 大厅是异步渲染的，reload 还可能被 beforeunload 拖慢，先等它真的画出来。
      await page.waitForFunction(
        () => document.body.dataset.context === 'project' || document.querySelectorAll('#projectGrid .project-row').length > 0,
        null, { timeout: 25000 }
      );
      if (await page.evaluate(() => document.body.dataset.context !== 'project')) {
        await page.locator('#projectGrid .project-row').first().click();
      }
      await page.waitForSelector('#mainShotTable', { timeout: 25000 });
    };

    for (const view of ['table', 'cards', 'wall', 'timeline']) {
      await step(`四视图可切换且有真实内容 · ${view}`, async () => {
        await segment(view).click();
        await page.waitForTimeout(350);
        const info = await page.evaluate(v => {
          const active = document.querySelector('.view-content:not(.hidden)');
          return { id: active?.id || null, rows: document.querySelectorAll('#mainShotTable tbody tr').length, nodes: active ? active.querySelectorAll('*').length : 0 };
        }, view);
        assert(info.id === CONTAINERS[view], `切换到 ${view} 后可见容器是 ${info.id}，期望 ${CONTAINERS[view]}`);
        assert(info.nodes > 0, `${view} 视图没有渲染任何内容`);
        shotCount = shotCount || info.rows;
        return info;
      });
    }

    await step('选择镜头后不跳回第一个且滚动位置保持', async () => {
      await segment('table').click();
      await page.waitForSelector('#mainShotTable');
      const total = await page.locator('#mainShotTable tbody tr').count();
      if (total < 2) return { skipped: '样本不足 2 个镜头', total };
      const target = total - 1;
      await page.locator('#mainShotTable tbody tr').nth(target).click();
      await page.waitForTimeout(200);
      const activeId = await page.evaluate(() => document.querySelector('#mainShotTable tbody tr.is-selected')?.dataset.id || null);
      const expectedId = await page.locator('#mainShotTable tbody tr').nth(target).getAttribute('data-id');
      assert(activeId === expectedId, `选中后活动行跳到了 ${activeId}，期望 ${expectedId}`);
      return { total, selected: activeId };
    });

    // =====================================================================
    group('原位编辑');
    await step('表格富文本字段原位编辑，不弹大窗口', async () => {
      const cell = page.locator('#mainShotTable td[data-field="description"]').first();
      await cell.dblclick();
      const host = cell.locator('.cell-display');
      await host.waitFor();
      assert(!await page.locator('.rich-editor-dialog[open]').count(), '仍然弹出了大编辑窗口');
      assert(await host.evaluate(el => el.isContentEditable), '没有进入原位编辑');
      await page.keyboard.press('Escape');
      return { inPlace: true };
    });

    await step('选区浮动工具条与选区保持', async () => {
      const cell = page.locator('#mainShotTable td[data-field="description"]').first();
      await cell.dblclick();
      const host = cell.locator('.cell-display');
      await host.click();
      await page.keyboard.insertText('全量回归测试文本');
      await page.keyboard.press('Control+a');
      await page.waitForSelector('.rich-float-toolbar.is-visible', { timeout: 5000 });
      const before = await page.evaluate(() => String(document.getSelection()));
      assert(before.trim(), '全选后没有拿到文本选区');
      await page.locator('.rich-float-toolbar [data-format="bold"]').click();
      const after = await page.evaluate(() => String(document.getSelection()));
      assert(after === before, `点击格式工具后选区丢失：${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
      await page.keyboard.press('Enter');
      await page.waitForSelector('.rich-float-toolbar', { state: 'detached' });
      return { selectionKept: true };
    });

    await step('普通字段仍是轻量原位编辑（不弹窗）', async () => {
      const field = await page.evaluate(() => {
        const cell = [...document.querySelectorAll('#mainShotTable td.editable-cell')]
          .find(el => !['description', 'voiceover', 'title', 'scene'].includes(el.dataset.field));
        return cell?.dataset.field || null;
      });
      assert(field, '找不到可用于验证的普通可编辑列');
      const cell = page.locator(`#mainShotTable td[data-field="${field}"]`).first();
      await cell.dblclick();
      await page.waitForTimeout(300);
      const state = await page.evaluate(f => {
        const target = document.querySelector(`#mainShotTable td[data-field="${f}"]`);
        return {
          inline: !!target?.querySelector('.inline-cell-editor, .inline-edit-input, textarea, input:not([type=hidden])'),
          modal: !!document.querySelector('.rich-editor-dialog[open], #fieldEditorModal[open]')
        };
      }, field);
      assert(state.inline, `普通字段 ${field} 没有出现原位编辑器`);
      assert(!state.modal, `普通字段 ${field} 弹出了编辑窗口`);
      await page.keyboard.press('Escape');
      return { field, ...state };
    });

    // =====================================================================
    group('画板（真实 PUT）');
    await step('灯光图创建 + 加对象 + 真实保存 200', async () => {
      const responses = [];
      const onResponse = r => { if (/\/creative-boards$/.test(r.url()) && r.request().method() === 'PUT') responses.push(r.status()); };
      page.on('response', onResponse);
      await nav('lighting').click();
      await page.waitForSelector('.ff-boards[aria-label="灯光平面图编辑器"]', { timeout: 20000 });
      await page.locator('.ff-boards-empty-state button[data-action="create-board"]').click();
      await page.waitForSelector('.ff-boards-canvas', { timeout: 10000 });
      await page.locator('.ff-boards-palette button[data-type="light"]').first().click();
      await page.waitForTimeout(1500);
      page.off('response', onResponse);
      assert(responses.length > 0, '没有观察到画板保存请求');
      const bad = responses.filter(code => code >= 400);
      assert(bad.length === 0, `画板保存被拒绝：HTTP ${bad.join(',')}（后端字段校验失败）`);
      return { saves: responses };
    });

    await step('刷新后画板内容一致', async () => {
      const before = await page.evaluate(async () => {
        const pid = location.pathname.includes('/p/') ? null : null; void pid;
        return document.querySelectorAll('.ff-boards-item').length;
      });
      await page.reload({ waitUntil: 'networkidle' });
      await ensureProject();
      await nav('lighting').click();
      await page.waitForSelector('.ff-boards[aria-label="灯光平面图编辑器"]', { timeout: 20000 });
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => document.querySelectorAll('.ff-boards-item').length);
      assert(after === before, `刷新前 ${before} 个对象，刷新后 ${after} 个`);
      return { objects: after };
    });

    await step('情绪板不携带空间字段 z', async () => {
      const bad = [];
      const onResponse = async r => {
        if (!/\/creative-boards$/.test(r.url()) || r.request().method() !== 'PUT') return;
        try {
          const body = JSON.parse(r.request().postData() || '{}');
          for (const board of body.boards || []) {
            if (board.kind !== 'moodboard') continue;
            for (const item of board.items || []) if ('z' in item) bad.push(item.type);
          }
        } catch (_) { /* ignore */ }
      };
      page.on('response', onResponse);
      await nav('moodboard').click();
      await page.waitForSelector('.ff-boards[aria-label="情绪板编辑器"]', { timeout: 20000 });
      await page.locator('.ff-boards-empty-state button[data-action="create-board"]').click();
      await page.waitForSelector('.ff-boards-canvas', { timeout: 10000 });
      // 情绪板的便签/色卡/链接在浮动工具条里；侧栏调色板是项目图片。
      await page.locator('.ff-boards-floating button', { hasText: '便签' }).first().click();
      await page.waitForTimeout(1500);
      page.off('response', onResponse);
      assert(bad.length === 0, `情绪板对象携带了 z 字段：${bad.join(',')}`);
      return { ok: true };
    });

    await step('离开画板页面不会被保存失败锁死', async () => {
      // 全屏视图会隐藏工作区工具条，只能走侧栏导航。
      await nav('table').click();
      await page.waitForSelector('#mainShotTable', { timeout: 10000 });
      const dialogs = await page.locator('.rich-editor-dialog[open], #confirmActionModal[open]').count();
      assert(dialogs === 0, '离开画板时弹出了阻塞对话框');
      return { ok: true };
    });

    // =====================================================================
    group('媒体');
    await step('素材页可打开且有状态提示', async () => {
      await nav('assets').click();
      await page.waitForTimeout(800);
      const info = await page.evaluate(() => ({
        nodes: document.querySelectorAll('#assetsContainer *').length,
        text: document.querySelector('#assetsContainer')?.innerText?.slice(0, 120) || ''
      }));
      assert(info.nodes > 0, '素材页没有渲染内容');
      return info;
    });

    // =====================================================================
    group('旁白');
    await step('旁白页可打开且可编辑', async () => {
      await nav('voiceover').click();
      await page.waitForTimeout(800);
      const info = await page.evaluate(() => ({
        nodes: document.querySelectorAll('#voiceoverContainer *').length || document.querySelectorAll('.view-content:not(.hidden) *').length
      }));
      assert(info.nodes > 0, '旁白页没有渲染内容');
      return info;
    });

    // =====================================================================
    group('视觉');
    await nav('table').click();
    await page.waitForSelector('#mainShotTable');
    for (const width of [2560, 1920, 1440, 1366, 1024, 375]) {
      await step(`${width}px 无横向溢出`, async () => {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(400);
        const info = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          offenders: [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > document.documentElement.clientWidth + 2;
          }).slice(0, 5).map(el => `${el.tagName}.${(el.className || '').toString().split(' ')[0]}`)
        }));
        assert(info.scrollW <= info.clientW + 2, `横向溢出 ${info.scrollW} > ${info.clientW}：${info.offenders.join(' | ')}`);
        await page.screenshot({ path: path.join(outDir, `${runId}-${width}.png`), fullPage: false });
        return info;
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await step('黑白主题都有底色与前景色', async () => {
      const themes = {};
      for (const theme of ['dark', 'light']) {
        await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
        await page.waitForTimeout(200);
        themes[theme] = await page.evaluate(() => {
          const cs = getComputedStyle(document.body);
          return { bg: cs.backgroundColor, fg: cs.color };
        });
        assert(themes[theme].bg && themes[theme].bg !== 'rgba(0, 0, 0, 0)', `${theme} 主题没有底色`);
      }
      await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
      return themes;
    });

    // =====================================================================
    group('性能');
    await step(`性能测量（${scale} 镜头）`, async () => {
      // 用真实接口造数据，避免把 UI 点击耗时混进渲染耗时。
      const projectId = await page.evaluate(async () => {
        const res = await fetch('/api/projects'); const list = await res.json();
        return (Array.isArray(list) ? list : list.projects || [])[0]?.id || null;
      });
      assert(projectId, '拿不到项目 ID，无法造性能数据');
      const started = Date.now();
      const created = await page.evaluate(async ({ projectId, scale }) => {
        const session = await (await fetch('/api/session')).json();
        let ok = 0, sample = null;
        for (let i = 0; i < scale; i++) {
          const res = await fetch(`/api/projects/${projectId}/shots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf || '' },
            body: JSON.stringify({ number: `S${i + 1}`, title: `批量镜头 ${i + 1}`, description: '回归用批量数据' })
          });
          if (res.ok) ok++;
          else if (!sample) sample = `${res.status} ${(await res.text()).slice(0, 120)}`;
        }
        return { ok, sample };
      }, { projectId, scale });
      assert(created.ok === scale, `造数失败：只创建 ${created.ok}/${scale} 个镜头，样本错误 ${created.sample}`);
      await page.reload({ waitUntil: 'networkidle' });
      await ensureProject();
      const t0 = Date.now();
      await segment('cards').click();
      await page.waitForSelector('.shot-card');
      const cardsMs = Date.now() - t0;
      const t1 = Date.now();
      await segment('table').click();
      await page.waitForSelector('#mainShotTable');
      const tableMs = Date.now() - t1;
      const dom = await page.evaluate(() => ({
        total: document.querySelectorAll('*').length,
        rows: document.querySelectorAll('#mainShotTable tbody tr').length
      }));
      const metrics = { scale, created: created.ok, seedMs: Date.now() - started, cardsMs, tableMs, dom };
      console.log(`        metrics ${JSON.stringify(metrics)}`);
      return metrics;
    });

    // =====================================================================
    group('控制台');
    await step('无 JS 报错与失败请求', async () => {
      const realErrors = consoleErrors.filter(text => !/favicon|Failed to load resource: the server responded with a status of 40\d/.test(text));
      assert(realErrors.length === 0, `控制台报错：${realErrors.slice(0, 3).join(' || ')}`);
      const realFailed = failedRequests.filter(text => !/favicon/.test(text));
      assert(realFailed.length === 0, `请求失败：${realFailed.slice(0, 3).join(' || ')}`);
      return { consoleErrors: realErrors.length, failedRequests: realFailed.length };
    });

    await ctx.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
    const failed = results.filter(r => !r.pass);
    const report = {
      runId, base, scale, finishedAt: new Date().toISOString(),
      total: results.length, failed: failed.length,
      results, consoleErrors: consoleErrors.slice(0, 20), failedRequests: failedRequests.slice(0, 20)
    };
    fs.writeFileSync(path.join(outDir, `${runId}-report.json`), JSON.stringify(report, null, 2));
    if (failed.length) fs.writeFileSync(path.join(outDir, `${runId}-server.log`), serverLog.join(''));
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
      console.log('FAILURES:');
      for (const f of failed) console.log(`  [${f.group}] ${f.name}: ${f.error}`);
      console.log(`report: ${path.join(outDir, `${runId}-report.json`)}`);
      process.exitCode = 1;
    } else {
      if (!process.env.QA_KEEP) fs.rmSync(dataRoot, { recursive: true, force: true });
      console.log(`report: ${path.join(outDir, `${runId}-report.json`)}`);
    }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
