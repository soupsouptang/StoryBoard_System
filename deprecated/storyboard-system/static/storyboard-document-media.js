// Shared image preparation for storyboard PDF previews and editable Word exports.
// The host supplies the current shot-media selector; this module owns all media I/O.
(() => {
  function create(getShotPrimaryMedia) {
  function printableMediaUrl(shot) {
    const media = getShotPrimaryMedia(shot);
    return media ? new URL(media, location.origin).href : '';
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  async function preflight(shots, onProgress = () => {}, { compact = false, wordCompatible = false } = {}) {
    const mediaMap = new Map();
    const failures = [];
    const mediaCache = new Map();
    let cursor = 0, completed = 0;
    const loadMedia = url => {
      if (mediaCache.has(url)) return mediaCache.get(url);
      const pending = (async () => {
        const controller = new AbortController();
        let timer;
        try {
          const read = async () => {
            const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            if (!blob.type.startsWith('image/')) throw new Error('当前素材不是可嵌入的图片');
            const dataUrl = await blobToDataUrl(blob);
            const image = new Image();
            await new Promise((resolve, reject) => {
              image.onload = resolve;
              image.onerror = () => reject(new Error('图片解码失败'));
              image.src = dataUrl;
            });
            if (wordCompatible && (!/^image\/(jpeg|png)$/i.test(blob.type) ||
                Math.max(image.naturalWidth, image.naturalHeight) > 1600 || blob.size > 750000)) {
              const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
              canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
              const context = canvas.getContext('2d');
              context.fillStyle = '#fff';
              context.fillRect(0, 0, canvas.width, canvas.height);
              context.drawImage(image, 0, 0, canvas.width, canvas.height);
              return canvas.toDataURL('image/jpeg', 0.84);
            }
            if (compact && /^image\/(jpeg|png|webp)$/i.test(blob.type) &&
                (Math.max(image.naturalWidth, image.naturalHeight) > 1600 || blob.size > 750000)) {
              try {
                const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                const optimized = canvas.toDataURL('image/webp', 0.84);
                if (optimized.startsWith('data:image/webp') && optimized.length < dataUrl.length) return optimized;
              } catch (_) { /* Keep the validated original when canvas conversion is unavailable. */ }
            }
            return dataUrl;
          };
          return await Promise.race([read(), new Promise((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(new Error('图片读取超时，请重试')); }, 15000);
          })]);
        } catch (error) {
          if (error.name === 'AbortError') throw new Error('图片读取超时，请重试');
          throw error;
        } finally {
          clearTimeout(timer);
        }
      })();
      mediaCache.set(url, pending);
      return pending;
    };
    const worker = async () => { while (cursor < shots.length) {
      const shot = shots[cursor++];
      try {
        const url = printableMediaUrl(shot);
        if (!url) continue;
        mediaMap.set(shot.id, await loadMedia(url));
      } catch (error) {
        failures.push({ number: shot.number, reason: error.message || '读取失败' });
      } finally {
        onProgress(++completed, shots.length);
      }
    }};
    await Promise.all(Array.from({ length: Math.min(6, shots.length) }, worker));
    return { mediaMap, failures };
  }

  return { preflight };
  }
  globalThis.FrameForgeDocumentMedia = Object.freeze({ create });
})();
