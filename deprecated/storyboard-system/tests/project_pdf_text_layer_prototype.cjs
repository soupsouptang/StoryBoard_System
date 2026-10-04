/* Local feasibility proof: Chromium print PDF retains Chinese text after an attachment is added. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const context = {Date, Map};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'static/storyboard-landscape-export.js'), 'utf8'), context);

(async () => {
  const executablePath = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'
  ].find(fs.existsSync);
  const browser = await chromium.launch({headless:true, ...(executablePath ? {executablePath} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const shots = Array.from({length:13}, (_, i) => ({
      id:`shot-${i + 1}`, number:String(i + 1).padStart(3, '0'),
      title:`港口分镜 ${i + 1}`, description:`巨轮驶入港口，灯光映照海面。第 ${i + 1} 镜。`,
      voiceover:'旁白：我们从这里出发。', shot_size:'大全景', movement:'缓慢推镜'
    }));
    const html = context.FrameForgeLandscapeExport.build({
      project:{name:'中文测试项目', aspect_ratio:'16:9', fps:25}, shots,
      fields:['number','title','description','voiceover','shot_size','movement']
    });
    await page.setContent(html, {waitUntil:'load'});
    await page.screenshot({path:path.join(root, 'scratch/project-pdf-text-layer-prototype.png'), fullPage:false});
    const pdf = await page.pdf({preferCSSPageSize:true, printBackground:true});
    const python = `import io, json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'vendor'))
from pypdf import PdfReader
from project_pdf_roundtrip import embed_project_backup, extract_project_backup
backup = json.dumps({'project':{}, 'shots':[], '_backup':{'version':2,'tables':{},'files':{}}}).encode()
wrapped = embed_project_backup(sys.stdin.buffer.read(), backup)
result = PdfReader(io.BytesIO(wrapped))
print(json.dumps({'pages': len(result.pages), 'text': ''.join(page.extract_text() or '' for page in result.pages), 'backup': extract_project_backup(wrapped).decode()}))`;
    const pythonExecutable = process.env.FRAMEFORGE_TEST_PYTHON || 'py';
    const pythonArgs = pythonExecutable === 'py' ? ['-3', '-c', python] : ['-c', python];
    const result = JSON.parse(execFileSync(pythonExecutable, pythonArgs, {
      cwd:root, input:pdf, encoding:'utf8', maxBuffer:4 * 1024 * 1024
    }));
    const text = result.text.replace(/\s+/g, '');
    assert.ok(result.pages >= 2, 'many shots paginate into multiple A4 pages');
    for (const value of ['中文测试项目', '港口分镜1', '巨轮驶入港口', '旁白', '港口分镜13']) {
      assert.ok(text.includes(value), `selectable PDF text includes ${value}`);
    }
    assert.deepEqual(JSON.parse(result.backup), {project:{}, shots:[], _backup:{version:2,tables:{},files:{}}});
    console.log(`PASS selectable Chinese PDF text survives attachment; ${result.pages} A4 pages for ${shots.length} shots`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
