/* Editable A4 landscape Word storyboard. Receives presentation values, never application state. */
((global) => {
  const encoder = new TextEncoder();
  const categories = [
    ['画面', new Set(['title', 'chapter', 'scene', 'shot_size', 'lens', 'movement', 'angle', 'height', 'description', 'action', 'composition', 'performance'])],
    ['声音与文字', new Set(['voiceover', 'dialogue', 'subtitle', 'music', 'sound'])],
    ['执行与备注', new Set(['duration', 'tc', 'methods', 'primary_method', 'secondary_methods', 'department', 'owner', 'equipment', 'sensor', 'aperture', 'shutter', 'camera_fps', 'transition', 'director_notes', 'notes'])]
  ];
  const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  const paragraph = (value, style = '') => {
    const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
    const runs = lines.map((line, index) => `${index ? '<w:r><w:br/></w:r>' : ''}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('');
    return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs}</w:p>`;
  };
  const fieldParagraph = ({ label, value }) => `<w:p><w:pPr><w:spacing w:after="90"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${xml(label)}  </w:t></w:r>${String(value).replace(/\r\n?/g, '\n').split('\n').map((line, index) => `${index ? '<w:r><w:br/></w:r>' : ''}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('')}</w:p>`;

  function classify(fields) {
    const remaining = [...fields];
    const result = categories.map(([title, members]) => {
      const entries = remaining.filter(field => members.has(field.key));
      entries.forEach(entry => remaining.splice(remaining.indexOf(entry), 1));
      return { title, entries };
    });
    if (remaining.length) result.push({ title: '其他字段', entries: remaining });
    return result.filter(group => group.entries.length);
  }

  function decodeImage(dataUrl, index) {
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl || ''));
    if (!match) return null;
    const binary = atob(match[2]);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return { bytes, name: `image${index}.${match[1].toLowerCase() === 'jpeg' ? 'jpg' : 'png'}`, type: match[1].toLowerCase() === 'jpeg' ? 'image/jpeg' : 'image/png' };
  }
  function drawing(image, id) {
    const cx = 2700000, cy = 1518750; // 75 x 42.2 mm, 16:9.
    return `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="SHOT ${id} image"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${image.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  // A stored ZIP keeps the browser implementation dependency-free and preserves
  // exact OOXML bytes. The browser download is a real .docx, not renamed HTML.
  const crcTable = Uint32Array.from({length:256}, (_, n) => {
    for (let i = 0; i < 8; i++) n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  const crc32 = bytes => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const put16 = (view, offset, value) => view.setUint16(offset, value, true);
  const put32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);
  function zip(entries) {
    const chunks = [], directory = [];
    let offset = 0;
    const push = bytes => { chunks.push(bytes); offset += bytes.length; };
    for (const [name, contents] of entries) {
      const nameBytes = encoder.encode(name), bytes = typeof contents === 'string' ? encoder.encode(contents) : contents;
      const crc = crc32(bytes), start = offset;
      const local = new Uint8Array(30 + nameBytes.length), localView = new DataView(local.buffer);
      put32(localView, 0, 0x04034b50); put16(localView, 4, 20); put16(localView, 6, 0x800);
      put32(localView, 14, crc); put32(localView, 18, bytes.length); put32(localView, 22, bytes.length);
      put16(localView, 26, nameBytes.length); local.set(nameBytes, 30); push(local); push(bytes);
      const central = new Uint8Array(46 + nameBytes.length), centralView = new DataView(central.buffer);
      put32(centralView, 0, 0x02014b50); put16(centralView, 4, 20); put16(centralView, 6, 20);
      put16(centralView, 8, 0x800); put32(centralView, 16, crc);
      put32(centralView, 20, bytes.length); put32(centralView, 24, bytes.length);
      put16(centralView, 28, nameBytes.length); put32(centralView, 42, start);
      central.set(nameBytes, 46); directory.push(central);
    }
    const directoryStart = offset;
    directory.forEach(push);
    const end = new Uint8Array(22), endView = new DataView(end.buffer);
    put32(endView, 0, 0x06054b50); put16(endView, 8, entries.length);
    put16(endView, 10, entries.length); put32(endView, 12, offset - directoryStart);
    put32(endView, 16, directoryStart); push(end);
    return new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function build({ project = {}, shots = [], mediaMap = new Map(), fields = [], labels = {} } = {}) {
    const images = [], relations = [];
    const shotXml = shots.map((shot, shotIndex) => {
      const number = String(shot.number || shotIndex + 1);
      const categorized = classify(fields.filter(field => field.key !== 'number').map(field => ({
        key: field.key, label: field.label || labels[field.key] || field.key,
        value: shot.values?.[field.key] ?? ''
      })).filter(field => String(field.value).trim()));
      let imageXml = paragraph('16:9 分镜图框');
      const image = decodeImage(mediaMap.get(shot.id), images.length + 1);
      if (image) {
        const id = images.length + 1;
        images.push(image);
        relations.push(`<Relationship Id="rId${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.name}"/>`);
        imageXml = drawing(image, id);
      }
      const content = categorized.map(group => `${paragraph(group.title, 'Heading3')}${group.entries.map(fieldParagraph).join('')}`).join('') || paragraph('暂无已选字段内容');
      return `${paragraph(`SHOT ${number}`, 'Heading2')}<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="B8BEC4"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4740"/><w:gridCol w:w="9440"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="4740" w:type="dxa"/></w:tcPr>${imageXml}</w:tc><w:tc><w:tcPr><w:tcW w:w="9440" w:type="dxa"/></w:tcPr>${content}</w:tc></w:tr></w:tbl>`;
    }).join('');
    const title = String(project.name || 'FRAMEFORGE');
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${paragraph(title, 'Title')}${paragraph(`横版画面分镜表 · ${project.aspect_ratio || '16:9'} · ${project.fps || 25} fps · ${shots.length} 镜头`)}${shotXml}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="284" w:footer="284" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:keepNext/><w:spacing w:before="110" w:after="60"/></w:pPr><w:rPr><w:b/><w:color w:val="5C6570"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
    const relRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
    const relDocument = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relations.join('')}</Relationships>`;
    return zip([['[Content_Types].xml', contentTypes], ['_rels/.rels', relRoot], ['word/document.xml', documentXml], ['word/styles.xml', styles], ['word/_rels/document.xml.rels', relDocument], ...images.map(image => [`word/media/${image.name}`, image.bytes])]);
  }
  global.FrameForgeWordExport = Object.freeze({ build });
})(globalThis);
