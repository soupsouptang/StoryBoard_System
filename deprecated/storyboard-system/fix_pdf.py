import sys

with open('static/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the duplicate openPdfExportModal logic at the end (from '// PDF Export Modal Logic' to 'boot().catch(')
idx_dup = content.find('// PDF Export Modal Logic')
idx_boot = content.find('boot().catch(', idx_dup)
if idx_dup != -1 and idx_boot != -1:
    content = content[:idx_dup] + content[idx_boot:]

# 2. Rewrite buildPdfDocument
start = content.find('function buildPdfDocument')
if start != -1:
    end = content.find('}', content.find('return head + `<table>', start)) + 1
    
    new_pdf = '''function buildPdfDocument(layout) {
  const project = state.bundle.project;
  const shots = state.bundle.shots || [];
  const layoutTitle = { table: '分镜表', board: '九宫格', detail: '单镜详细' }[layout] || '分镜表';
  const generatedAt = new Date().toLocaleString('zh-CN');
  
  const script = `<script>
    window.onload = () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const btn = document.getElementById('printBtn');
      let loaded = 0;
      let errors = 0;
      
      if (imgs.length === 0) {
        btn.textContent = '打印 / 另存为 PDF';
        btn.disabled = false;
        return;
      }
      
      imgs.forEach(img => {
        if (img.complete) {
          if (img.naturalWidth === 0) { errors++; img.alt = '图片加载失败\\nSHOT ' + img.dataset.shot; }
          else loaded++;
          checkDone();
        } else {
          img.onload = () => { loaded++; checkDone(); };
          img.onerror = () => { errors++; img.alt = '图片加载失败\\nSHOT ' + img.dataset.shot; checkDone(); };
        }
      });
      
      function checkDone() {
        if (loaded + errors === imgs.length) {
          btn.textContent = errors > 0 ? \`打印 / 另存为 PDF (\${errors} 张图片未加载完成)\` : '打印 / 另存为 PDF';
          btn.disabled = false;
          if (errors === 0) setTimeout(() => window.print(), 200);
        } else {
          btn.textContent = \`图片加载中... (\${loaded + errors}/\${imgs.length})\`;
        }
      }
    };
  <\/script>`;

  const head = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(project.name)} — ${layoutTitle}</title><style>
    @page { margin: 12mm; size: A4; } * { box-sizing: border-box; } body { margin: 0; color: #151617; font: 10pt/1.45 "Satoshi", "Sarasa Gothic SC", "更纱黑体 SC", "PingFang SC", sans-serif; background: #fff; }
    .toolbar { position: fixed; right: 12mm; top: 8mm; z-index: 2; } .toolbar button { border: 0; border-radius: 6px; background: #151617; color: #fff; padding: 8px 14px; font: inherit; font-weight: 500; cursor: pointer; } .toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
    .doc-header { border-bottom: 2px solid #151617; padding-bottom: 5mm; margin-bottom: 6mm; } h1 { font-size: 18pt; margin: 0; font-weight: 700; } .meta { color: #526075; margin-top: 2mm; font-variant-numeric: tabular-nums; } table { width: 100%; border-collapse: collapse; } th { background: #fff; text-align: left; font-size: 8.5pt; font-weight: 500; border-bottom: 1px solid #151617; } th, td { border: none; border-bottom: 1px solid rgba(0,0,0,0.1); padding: 6px 4px; vertical-align: top; } tr { break-inside: avoid; } thead { display: table-header-group; }
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; } .board-card { break-inside: avoid; min-height: 70mm; overflow: hidden; } .board-image { display: grid; place-items: center; aspect-ratio: 16 / 9; background: #f8f9fa; color: #526075; overflow: hidden; } .board-image img { width: 100%; height: 100%; object-fit: cover; } .board-body { padding: 3mm 0; } .shot-label { color: #151617; font-weight: 700; } .shot-title { font-size: 11pt; font-weight: 700; margin: 1mm 0; }
    .detail { break-after: page; border-bottom: 1px solid #151617; padding-bottom: 7mm; margin-bottom: 7mm; } .detail:last-child { break-after: auto; border-bottom: none; } .detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6mm; } .detail-image { display: grid; place-items: center; aspect-ratio: 16 / 9; background: #f8f9fa; color: #526075; overflow: hidden; } .detail-image img { width: 100%; height: 100%; object-fit: cover; } .detail dl { display: grid; grid-template-columns: 72px 1fr; gap: 2mm 4mm; margin: 0; } .detail dt { color: #526075; } .detail dd { margin: 0; font-variant-numeric: tabular-nums; }
    @media print { .toolbar { display: none; } } @media screen { body { max-width: 210mm; margin: 16mm auto; box-shadow: 0 2px 18px #0002; padding: 12mm; } }
  </style>${script}</head><body><div class="toolbar"><button type="button" id="printBtn" disabled onclick="window.print()">准备打印...</button></div><header class="doc-header"><h1>${escapeHtml(project.name)}</h1><div class="meta">${layoutTitle} · ${escapeHtml(project.aspect_ratio || '16:9')} · ${escapeHtml(String(project.fps || 25))} fps · ${shots.length} 镜头 · ${escapeHtml(generatedAt)}</div></header>`;

  if (layout === 'board') {
    return head + `<main class="board">${shots.map(shot => {
      const media = printableMediaUrl(shot);
      return \`<article class="board-card"><div class="board-image">\${media ? \`<img src="\${escapeHtml(media)}" data-shot="\${escapeHtml(shot.number)}" alt="SHOT \${escapeHtml(shot.number)}">\` : \`<span class="empty">暂无图片<br>SHOT \${escapeHtml(shot.number)}</span>\`}</div><div class="board-body"><div class="shot-label">SHOT \${escapeHtml(shot.number)} · \${escapeHtml(String(shot.duration_seconds || ''))}s</div><div class="shot-title">\${escapeHtml(shot.title || '')}</div><div>\${escapeHtml(shot.description || '')}</div><div class="meta">\${escapeHtml(shot.primary_method || '')} · \${escapeHtml(shot.movement || '')}</div></div></article>\`;
    }).join('')}</main></body></html>`;
  }

  if (layout === 'detail') {
    return head + `<main>${shots.map(shot => {
      const media = printableMediaUrl(shot);
      return \`<article class="detail"><div class="shot-label">SHOT \${escapeHtml(shot.number)} · \${escapeHtml(shot.tc_in || '')} - \${escapeHtml(shot.tc_out || '')}</div><h2>\${escapeHtml(shot.title || '未命名')}</h2><div class="detail-grid"><div class="detail-image">\${media ? \`<img src="\${escapeHtml(media)}" data-shot="\${escapeHtml(shot.number)}" alt="SHOT \${escapeHtml(shot.number)}">\` : \`<span class="empty">暂无图片<br>SHOT \${escapeHtml(shot.number)}</span>\`}</div><dl><dt>时长</dt><dd>\${escapeHtml(String(shot.duration_seconds || ''))}s / \${escapeHtml(String(shot.duration_frames || ''))}f</dd><dt>方式</dt><dd>\${escapeHtml(shot.primary_method || '')}</dd><dt>景别</dt><dd>\${escapeHtml(shot.shot_size || '')} / \${escapeHtml(shot.lens || '')}</dd><dt>运镜</dt><dd>\${escapeHtml(shot.movement || '')}</dd><dt>画面</dt><dd>\${escapeHtml(shot.description || '')}</dd><dt>旁白</dt><dd>\${escapeHtml(shot.voiceover || '')}</dd></dl></div></article>\`;
    }).join('')}</main></body></html>`;
  }

  return head + `<table><thead><tr><th>镜头</th><th>TC</th><th>时长</th><th>画面描述</th><th>旁白</th><th>摄影</th><th>制作</th></tr></thead><tbody>${shots.map(shot => \`<tr><td>SHOT \${escapeHtml(shot.number)}</td><td>\${escapeHtml(shot.tc_in || '')}<br>\${escapeHtml(shot.tc_out || '')}</td><td>\${escapeHtml(String(shot.duration_seconds || ''))}s<br>\${escapeHtml(String(shot.duration_frames || ''))}f</td><td>\${escapeHtml(shot.description || '')}</td><td>\${escapeHtml(shot.voiceover || '')}</td><td>\${escapeHtml(shot.shot_size || '')}<br>\${escapeHtml(shot.movement || '')}</td><td>\${escapeHtml(shot.primary_method || '')}</td></tr>\`).join('')}</tbody></table></body></html>`;
}'''
    content = content[:start] + new_pdf + content[end:]
    
with open('static/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done rewriting PDF logic')
