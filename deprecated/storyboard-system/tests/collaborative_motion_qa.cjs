const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('static/app.js', 'utf8');
const start = source.indexOf('const collaborativeMotionAnimations = new Set();');
const end = source.indexOf('async function pollProjectSync()', start);
assert.ok(start >= 0 && end > start, 'collaborative motion helpers should exist');

let reduceMotion = false;
let changeListener;
let tableHidden = false;
const observers = [];
const tableView = {classList: {contains: name => name === 'hidden' && tableHidden}};
const created = [];
const context = {
  matchMedia: () => ({matches: reduceMotion, addEventListener: (_name, listener) => { changeListener = listener; }}),
  document: {body: {dataset: {effects: 'full'}}, querySelector: selector => selector === '#viewTable' ? tableView : null},
  MutationObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe(target) { this.target = target; } },
  $: () => null,
  $$: () => [],
  innerHeight: 800,
  innerWidth: 1200,
  state: {inspectorOpen: false},
  console,
};
vm.createContext(context);
vm.runInContext(`${source.slice(start, end)}; globalThis.motionApi = {motionAllowed, animateElement, animateCollaborativePatch, cancelCollaborativeAnimations, collaborativeMotionAnimations};`, context);

function makeElement() {
  return {
    isConnected: true,
    animations: [],
    animate(_frames, options) {
      let resolveFinished;
      const animation = {
        id: options.id,
        effect: {target: this},
        canceled: false,
        finished: new Promise(resolve => { resolveFinished = resolve; }),
        cancel() { this.canceled = true; resolveFinished(); },
      };
      this.animations.push(animation);
      created.push(animation);
      return animation;
    },
  };
}

(async () => {
  const {motionAllowed, animateElement, animateCollaborativePatch, cancelCollaborativeAnimations, collaborativeMotionAnimations} = context.motionApi;
  const cell = makeElement();
  const first = animateElement(cell, [{opacity: 0}, {opacity: 1}]);
  assert.equal(created.length, 1, 'normal preference starts collaboration animation');
  const second = animateElement(cell, [{opacity: 0.2}, {opacity: 1}]);
  assert.equal(created[0].canceled, true, 'repeated update cancels previous animation on same element');
  animateCollaborativePatch({insertedShotIds: [], changedCells: []}, new Map());
  assert.equal(created[1].canceled, true, 'superseding remote patch cancels active animation');
  await Promise.all([first, second]);
  assert.equal(collaborativeMotionAnimations.size, 0, 'finished/canceled animations are released');

  const switchedViewCell = makeElement();
  const switchedViewAnimation = animateElement(switchedViewCell, [{opacity: 0}, {opacity: 1}]);
  tableHidden = true;
  observers.find(observer => observer.target === tableView).callback([{attributeName: 'class'}]);
  assert.equal(created[2].canceled, true, 'leaving the table view cancels in-flight collaboration animation');
  await switchedViewAnimation;
  tableHidden = false;

  const reducedCell = makeElement();
  animateElement(reducedCell, [{opacity: 0}, {opacity: 1}]);
  assert.equal(created.length, 4, 'animation can start before preference changes');
  context.document.body.dataset.effects = 'reduced';
  observers.find(observer => observer.target === context.document.body).callback([{attributeName: 'data-effects'}]);
  assert.equal(created[3].canceled, true, 'switching UI effects to reduced cancels in-flight animation');
  assert.equal(motionAllowed(), false, 'reduced effects blocks new animations');

  context.document.body.dataset.effects = 'full';
  reduceMotion = true;
  changeListener({matches: true});
  assert.equal(motionAllowed(), false, 'OS reduced-motion preference blocks new animations');
  const before = created.length;
  animateElement(makeElement(), [{opacity: 0}, {opacity: 1}]);
  assert.equal(created.length, before, 'OS preference prevents creating animations');
  console.log('PASS collaborative motion cancellation, rapid updates, and reduced-motion preferences');
})().catch(error => { console.error(error); process.exitCode = 1; });
