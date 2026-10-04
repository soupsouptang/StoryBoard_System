const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function unzipStored(bytes) {
  const files = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  for (let offset = 0; offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50;) {
    const length = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const contentStart = offset + 30 + nameLength + extraLength;
    files.set(name, bytes.subarray(contentStart, contentStart + length));
    offset = contentStart + length;
  }
  return files;
}

(async () => {
  const context = { TextEncoder, Blob, Uint8Array, Uint32Array, DataView, Map, Set, atob };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('static/storyboard-word-export.js', 'utf8'), context);
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lRwAAAAASUVORK5CYII=';
  const blob = context.FrameForgeWordExport.build({
    project: { name: '测试 <项目>', aspect_ratio: '16:9', fps: 25 },
    shots: [
      { id: 'a', number: '001', values: { description: '港口与 <桥吊>\n第二行', voiceover: '旁白一', 'custom:note': '自定义内容', equipment: '摄影机' } },
      { id: 'b', number: '002', values: { description: '长'.repeat(12000), dialogue: '对白二' } }
    ],
    mediaMap: new Map([['a', image]]),
    fields: [{key:'description',label:'画面描述'}, {key:'voiceover',label:'旁白'}, {key:'dialogue',label:'对白'}, {key:'equipment',label:'设备'}, {key:'custom:note',label:'自定义备注'}]
  });
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const files = unzipStored(new Uint8Array(await blob.arrayBuffer()));
  for (const file of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels', 'word/media/image1.png']) {
    assert.ok(files.has(file), `missing ${file}`);
  }
  const xml = new TextDecoder().decode(files.get('word/document.xml'));
  assert.match(xml, /w:orient="landscape"/);
  assert.equal((xml.match(/SHOT 00[12]/g) || []).length, 2);
  assert.match(xml, /画面描述/);
  assert.match(xml, /声音与文字/);
  assert.match(xml, /执行与备注/);
  assert.match(xml, /其他字段/);
  assert.match(xml, /自定义内容/);
  assert.match(xml, /港口与 &lt;桥吊&gt;/);
  assert.match(xml, /<w:br\/>/);
  assert.match(xml, /对白二/);
  assert.match(xml, /长{100}/);
  assert.doesNotMatch(xml, /<桥吊>/);
  assert.match(new TextDecoder().decode(files.get('word/_rels/document.xml.rels')), /media\/image1.png/);
  assert.equal(files.get('word/media/image1.png').length, 68);
  const artifactDir = path.join(__dirname, '..', 'qa-artifacts', 'landscape');
  fs.mkdirSync(artifactDir, {recursive:true});
  fs.writeFileSync(path.join(artifactDir, 'storyboard-word-image-contract.docx'), new Uint8Array(await blob.arrayBuffer()));
  console.log('PASS editable Word OOXML, categories, long fields, escaped text, image, landscape pages');
})().catch(error => { console.error(error); process.exitCode = 1; });
