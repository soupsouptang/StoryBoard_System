import type { MediaPresentation } from '@/lib/hooks/useAssets';

/** Preview only. The authoritative renderer and immutable sources remain in the API. */
export function drawMediaPreview(canvas: HTMLCanvasElement, image: HTMLImageElement, transform: MediaPresentation['transform'], maxDimension = 960) {
  const rotated = transform.rotation % 180 !== 0;
  const width = rotated ? image.naturalHeight : image.naturalWidth;
  const height = rotated ? image.naturalWidth : image.naturalHeight;
  const fit = Math.min(1, maxDimension / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * fit)); canvas.height = Math.max(1, Math.round(height * fit));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('浏览器无法生成图片预览。');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((transform.rotation + transform.straighten_degrees) * Math.PI / 180);
  ctx.scale(transform.flip_horizontal ? -1 : 1, transform.flip_vertical ? -1 : 1);
  ctx.drawImage(image, -image.naturalWidth * fit / 2, -image.naturalHeight * fit / 2, image.naturalWidth * fit, image.naturalHeight * fit);
  ctx.resetTransform();
  if (transform.scale === 1 && !transform.translation_x && !transform.translation_y && !transform.perspective_horizontal && !transform.perspective_vertical) return;
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const output = ctx.createImageData(canvas.width, canvas.height);
  const ph = Math.tan(transform.perspective_horizontal * Math.PI / 180);
  const pv = Math.tan(transform.perspective_vertical * Math.PI / 180);
  const d = 1 - ph / 2 - pv / 2, w = canvas.width, h = canvas.height;
  // Same inverse homography as Pillow; interaction defaults to <=960px.
  // ponytail: bounded preview sampling; use a GPU shader if profiling shows drag latency.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const denominator = ph * x / (w * d) + pv * y / (h * d) + 1;
    const sx = Math.round(((1 / transform.scale + ph / 2) * x / d + w * pv * y / (2 * h * d) + (w * d / 2 - w / (2 * transform.scale) - transform.translation_x * w) / d) / denominator);
    const sy = Math.round((h * ph * x / (2 * w * d) + (1 / transform.scale + pv / 2) * y / d + (h * d / 2 - h / (2 * transform.scale) - transform.translation_y * h) / d) / denominator);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
    const start = (sy * w + sx) * 4, end = (y * w + x) * 4;
    output.data.set(source.data.subarray(start, start + 4), end);
  }
  ctx.putImageData(output, 0, 0);
}
