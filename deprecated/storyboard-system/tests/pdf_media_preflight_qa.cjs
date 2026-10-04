const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('static/storyboard-document-media.js', 'utf8');
const requests = new Map();
const progress = [];
const context = {
  Map, Promise, Array, AbortController, clearTimeout, URL,
  location: {origin:'http://localhost'},
  setTimeout: (fn) => setTimeout(fn, 30),
  FileReader: class {
    readAsDataURL() { this.result = `data:image/png;base64,${'A'.repeat(1000)}`; queueMicrotask(() => this.onload()); }
  },
  Image: class {
    naturalWidth = 2400;
    naturalHeight = 1200;
    set src(_) { queueMicrotask(() => this.onload()); }
  },
  document: {createElement: () => ({
    getContext: () => ({fillRect() {}, drawImage() {}}),
    toDataURL: format => format === 'image/jpeg' ? 'data:image/jpeg;base64,WORD' : 'data:image/webp;base64,SMALL'
  })},
  fetch: async url => {
    requests.set(url, (requests.get(url) || 0) + 1);
    if (url.endsWith('/hang')) return new Promise(() => {});
    return {ok:true, blob: async () => ({type:'image/png',size:1000000})};
  }
};
vm.createContext(context);
vm.runInContext(source, context);

(async () => {
  const shots = [
    {id:'one',number:'001',url:'shared'},
    {id:'two',number:'002',url:'shared'},
    {id:'three',number:'003',url:'hang'}
  ];
  const result = await context.FrameForgeDocumentMedia.create(shot => shot.url).preflight(shots, done => progress.push(done), {compact:true});
  assert.equal(requests.get('http://localhost/shared'), 1, 'same media should only be fetched once');
  assert.equal(result.mediaMap.get('one'), 'data:image/webp;base64,SMALL');
  assert.equal(result.mediaMap.get('two'), 'data:image/webp;base64,SMALL');
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].reason, /超时/);
  assert.equal(progress.at(-1), 3);
  const word = await context.FrameForgeDocumentMedia.create(shot => shot.url)
    .preflight([shots[0]], undefined, {wordCompatible:true});
  assert.equal(word.mediaMap.get('one'), 'data:image/jpeg;base64,WORD');
  console.log('PASS document media dedupe, PDF compact image, Word JPEG conversion and timeout');
})().catch(error => { console.error(error); process.exitCode = 1; });
