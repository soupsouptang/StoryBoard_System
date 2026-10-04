const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C://Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  const info = await p.evaluate(async () => {
    await document.fonts.ready;
    const loaded = [...document.fonts].map(f => `${f.family}/${f.weight}/${f.status}`);
    return {
      satoshi: document.fonts.check('400 12px Satoshi'),
      sarasaCJK: document.fonts.check('400 12px "Sarasa Gothic SC"'),
      sarasaForHan: document.fonts.check('400 12px "Sarasa Gothic SC"', '中文字形测试'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      loaded: loaded.slice(0, 12)
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
