const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../static/index.html'), 'utf8');
assert.ok(!html.includes('data-ui-mode-option'));
assert.ok(html.includes('data-ui-mode="unified"'));
function imageTest() {
  let tick, visibility;
  const classes = new Set();
  class Image {
    constructor() { this.dataset = {}; this.parentElement = {}; this.complete = false; this.isConnected = true; this.loading = 'lazy'; this.events = {}; }
    classList = { add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n)) };
    addEventListener(name, fn) { this.events[name] = fn; }
  }
  const c = { HTMLImageElement: Image, WeakMap, updateMediaHost() {}, setTimeout(fn) { tick = fn; return 1; }, clearTimeout() { tick = null; },
    IntersectionObserver: class { constructor(fn) { visibility = fn; } observe() {} disconnect() {} } };
  vm.createContext(c);
  vm.runInContext(source.slice(source.indexOf('const imageLoadControllers'), source.indexOf('function installMediaLoadFeedback')), c);
  const image = new Image(); c.bindImageLoadFeedback(image);
  assert.equal(tick, null); // lazy image is not requested below viewport
  visibility([{ isIntersecting: true }]); assert.equal(typeof tick, 'function');
  tick(); assert.ok(classes.has('is-media-error')); assert.ok(!classes.has('is-media-loading'));
  c.bindImageLoadFeedback(image); visibility([{ isIntersecting: true }]);
  image.events.load(); assert.equal(tick, null); assert.ok(classes.has('is-media-loaded'));
  image.complete = true; image.naturalWidth = 0; c.bindImageLoadFeedback(image);
  assert.ok(classes.has('is-media-error'));
}
function layoutTest() {
  const styles = {}, handles = {}, stored = {};
  for (const id of ['#timelineWidthResize', '#timelineHeightResize']) handles[id] = {
    events: {}, attrs: {}, addEventListener(name, fn) { this.events[name] = fn; }, setAttribute(k,v) { this.attrs[k] = v; }, setPointerCapture() {}
  };
  const container = { offsetWidth: 1000, offsetHeight: 600, getBoundingClientRect: () => ({ width: 1000, height: 600 }) };
  const c = { document: { documentElement: { style: { setProperty(k,v) { styles[k] = v; } }, classList: { add() {}, remove() {} } },
      querySelector: s => handles[s] || (s.startsWith('.timeline-') ? container : null), querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem(k,v) { stored[k] = v; } }, window: { innerWidth: 1400 } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/workspace-layout.js'), 'utf8'), c);
  const handle = handles['#timelineWidthResize'];
  const event = { button: 0, pointerId: 1, clientX: 100, preventDefault() {}, stopPropagation() {} };
  handle.events.pointerdown(event); handle.events.pointermove({ ...event, clientX: 900 });
  assert.equal(styles['--timeline-media-width'], '80%');
  handle.events.pointerup(event); assert.ok(stored['frameforge-layout-v1']);
  handle.events.dblclick(); assert.equal(styles['--timeline-media-width'], '65%');
  handle.events.keydown({ key: 'ArrowLeft', preventDefault() {} }); assert.equal(styles['--timeline-media-width'], '63%');
  handle.events.pointerdown(event); handle.events.pointermove({ ...event, clientX: 0 });
  handle.events.pointercancel({ ...event, type: 'pointercancel' }); assert.equal(styles['--timeline-media-width'], '63%');
}
imageTest(); layoutTest();
console.log('PASS unified mode, visible-image timeout/retry, panel limits/persistence/keyboard/cancel');
