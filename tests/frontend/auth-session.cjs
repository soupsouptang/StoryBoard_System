// Run: node tests/frontend/auth-session.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const root = require('node:path').resolve(__dirname, '../..');
const ts = require(root + '/node_modules/typescript');
const realRequire = require('node:module').createRequire(root + '/package.json');
const storage = new Map([['frameforge_token', 'account-a']]);
global.window = {};
global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
let response;
global.fetch = async () => { const value = await response; return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => value }; };
function load(path, overrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(root + '/' + path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: id => overrides[id] ?? realRequire(id), window, localStorage, fetch: (...args) => global.fetch(...args), process, console });
  return module.exports;
}
const api = load('apps/web/lib/api-client.ts');
const { useAuthStore: store } = load('apps/web/stores/authStore.ts', { '@/lib/api-client': api, '@/lib/i18n': { I18N_DICTIONARY: { 'zh-CN': {} } } });
let client;
const { QueryClient } = realRequire('@tanstack/react-query');
const react = { ...realRequire('react'), useState: fn => [fn()], useEffect: fn => fn() };
const { Providers } = load('apps/web/components/app-shell/Providers.tsx', {
  react, '@/stores/authStore': { useAuthStore: store }, '@frameforge/ui': { UIProvider: () => null },
  '@tanstack/react-query': { QueryClient: class extends QueryClient { constructor(options) { super(options); client = this; } }, QueryClientProvider: () => null }
});
let redirects = [];
const { default: WorkspaceLayout } = load('apps/web/app/(workspace)/layout.tsx', {
  react, '@/stores/authStore': { useAuthStore: () => store.getState() }, '@frameforge/ui': { Button: () => null },
  'next/navigation': { useRouter: () => ({ replace: path => redirects.push(path) }) }
});
function gated() { return WorkspaceLayout({ children: 'PROTECTED' }).props.children !== 'PROTECTED'; }
(async () => {
  let resolve;
  response = new Promise(r => resolve = r);
  Providers({ children: null });
  assert.equal(gated(), true);
  assert.equal(store.getState().status, 'loading');
  assert.equal(store.getState().user, null);
  resolve({ id: 'a', email: 'a@example.test' });
  await store.getState().restoreSession();
  assert.equal(store.getState().user.id, 'a');
  assert.equal(store.getState().status, 'authenticated');
  assert.equal(gated(), false);
  client.setQueryData(['production'], { owner: 'a' });
  store.getState().logout();
  assert.equal(client.getQueryData(['production']), undefined);
  assert.equal(storage.get('frameforge_token'), undefined);
  await store.getState().restoreSession();
  assert.equal(store.getState().status, 'anonymous');
  assert.equal(gated(), true);
  assert.equal(redirects.at(-1), '/login');
  storage.set('frameforge_token', 'account-a');
  response = new Promise(r => resolve = r);
  const pending = store.getState().restoreSession();
  store.getState().logout();
  store.getState().setAuth({ id: 'b' }, 'account-b');
  client.setQueryData(['production'], { owner: 'b' });
  resolve({ id: 'a' });
  await pending;
  assert.equal(store.getState().user.id, 'b');
  assert.equal(client.getQueryData(['production']).owner, 'b');
  store.getState().logout();
  assert.equal(client.getQueryCache().getAll().length, 0);
  storage.set('frameforge_token', 'expired');
  global.fetch = async () => ({ ok: false, status: 401, headers: { get: () => 'application/json' }, json: async () => ({ detail: 'Expired' }) });
  await store.getState().restoreSession();
  assert.equal(store.getState().status, 'anonymous');
  assert.equal(storage.get('frameforge_token'), undefined);
  storage.set('frameforge_token', 'offline');
  global.fetch = async () => { throw new Error('offline'); };
  await store.getState().restoreSession();
  assert.equal(store.getState().status, 'error');
  assert.equal(storage.get('frameforge_token'), 'offline');
  console.log('PASS: reload restores real user; anonymous/expired gate; logout clears cache; stale restore cannot replace new account; offline retains token.');
})().catch(error => { console.error(error); process.exitCode = 1; });
