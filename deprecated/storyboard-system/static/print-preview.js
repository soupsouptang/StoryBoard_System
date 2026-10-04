/* Runs in the generated same-origin preview without unsafe-inline scripts. */
(() => {
  const button = document.getElementById('printBtn');
  if (!button) return;
  const destinationHint = document.createElement('small');
  destinationHint.textContent = '需要可搜索、可供导入向导识别的文字时，请在浏览器打印目标中选择「另存为 PDF」；Microsoft Print to PDF 可能把文字转换为图形。完整工程回导请从 FrameForge 下载「工程 PDF」。';
  destinationHint.style.cssText = 'display:block;max-width:300px;margin-top:6px;padding:7px 9px;border-radius:5px;background:#fff;color:#30363d;box-shadow:0 1px 8px #0002;font:12px/1.5 sans-serif;';
  button.insertAdjacentElement('afterend', destinationHint);
  button.addEventListener('click', () => window.print());
  const images = [...document.querySelectorAll('img')];
  let done = 0, failures = 0;
  const finish = () => {
    button.textContent = done < images.length ? `准备图片 ${done} / ${images.length}`
      : `打印 / 另存为 PDF${failures ? `（${failures} 张图片未加载）` : ''}`;
    button.disabled = done < images.length;
  };
  images.forEach(img => {
    let settled = false;
    const settle = ok => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      done++;
      if (!ok) { failures++; img.alt = `图片未加载 · SHOT ${img.dataset.shot || ''}`; }
      finish();
    };
    const timer = setTimeout(() => settle(false), 15000);
    img.addEventListener('load', () => settle(true), { once: true });
    img.addEventListener('error', () => settle(false), { once: true });
    if (img.complete) settle(img.naturalWidth > 0);
  });
  finish();
})();
