import type { MediaPresentation } from './hooks/useAssets';
import { drawMediaPreview } from './media-preview';

export type ShotFraming = {
  source: { asset_id: string; panel_id: string; presentation_revision: number; source_version_id: string } | null;
  transform: MediaPresentation['transform'];
};
export const clampFraming = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function projectFrameRatio(value: string) {
  const parts = value.split(':').map(part => Number(part.trim()));
  if (parts.length !== 2 || !parts.every(n => Number.isFinite(n) && n > 0)) throw new Error('项目画幅比例无效，请检查项目设置');
  const integer = parts.map(n => Math.round(n * 1_000_000));
  if (!integer.every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('项目画幅比例无效，请检查项目设置');
  let a = integer[0], b = integer[1];
  while (b) [a, b] = [b, a % b];
  const [width, height] = integer.map(n => n / a);
  if (Math.max(width, height) > 9999) throw new Error('项目画幅比例过于精细，请检查项目设置');
  return { value: `${width}:${height}`, ratio: width / height };
}
export function fullFrame(aspectRatio: string, width: number, height: number): MediaPresentation['transform'] {
  const frame = projectFrameRatio(aspectRatio);
  const cropWidth = Math.min(1, frame.ratio / (width / height));
  const cropHeight = Math.min(1, (width / height) / frame.ratio);
  return { crop: { x: (1 - cropWidth) / 2, y: (1 - cropHeight) / 2, width: cropWidth, height: cropHeight },
    frame_fit: 'cover', rotation: 0, aspect_ratio: frame.value, output_width: Math.max(64, Math.min(1920, Math.floor(3840 * frame.ratio))),
    scale: 1, translation_x: 0, translation_y: 0, straighten_degrees: 0, perspective_horizontal: 0,
    perspective_vertical: 0, flip_horizontal: false, flip_vertical: false };
}
export function originalFrame(aspectRatio: string, width: number, height: number): MediaPresentation['transform'] {
  return { ...fullFrame(aspectRatio, width, height), crop: { x:0, y:0, width:1, height:1 }, frame_fit:'contain' };
}
export function panFraming(transform: MediaPresentation['transform'], dx: number, dy: number, width: number, height: number, sourceWidth?: number, sourceHeight?: number) {
  if (transform.frame_fit === 'contain' && sourceWidth && sourceHeight) {
    const fit = Math.min(width / sourceWidth, height / sourceHeight);
    width = sourceWidth * fit; height = sourceHeight * fit;
  }
  return { ...transform,
    translation_x: clampFraming(transform.translation_x + dx / width * transform.crop.width / transform.scale, -1, 1),
    translation_y: clampFraming(transform.translation_y + dy / height * transform.crop.height / transform.scale, -1, 1) };
}
export function zoomFraming(transform: MediaPresentation['transform'], scale: number) {
  const next = clampFraming(scale,.5,3);
  return { ...transform, scale:next,
    translation_x:clampFraming(transform.translation_x*transform.scale/next,-1,1),
    translation_y:clampFraming(transform.translation_y*transform.scale/next,-1,1) };
}
/** Uses the existing source-space renderer; only the API owns saved derivatives. */
export function drawShotFraming(canvas: HTMLCanvasElement, image: HTMLImageElement, transform: MediaPresentation['transform'], exportResolution = false) {
  const source = document.createElement('canvas');
  const contained = transform.frame_fit === 'contain';
  drawMediaPreview(source, image, contained ? { ...transform, scale:1, translation_x:0, translation_y:0 } : transform, exportResolution ? 3840 : 960);
  const crop = transform.crop;
  const sx = Math.round(crop.x * source.width), sy = Math.round(crop.y * source.height);
  const sw = Math.min(source.width, Math.round((crop.x + crop.width) * source.width)) - sx;
  const sh = Math.min(source.height, Math.round((crop.y + crop.height) * source.height)) - sy;
  const ratio = projectFrameRatio(transform.aspect_ratio || `${sw}:${sh}`).ratio;
  canvas.width = Math.max(1, Math.min(exportResolution ? 3840 : 960, transform.output_width));
  canvas.height = Math.max(1, Math.round(canvas.width / ratio));
  const context = canvas.getContext('2d');
  if (!context || sw < 1 || sh < 1) throw new Error('无法生成构图预览');
  context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height);
  // Match the canonical server renderer without stretching the image.
  const fit = (contained ? Math.min : Math.max)(canvas.width / sw, canvas.height / sh) * (contained ? transform.scale : 1);
  const dw = sw * fit, dh = sh * fit;
  const tx = contained ? transform.translation_x * dw : 0, ty = contained ? transform.translation_y * dh : 0;
  context.drawImage(source, sx, sy, sw, sh, (canvas.width - dw) / 2 + tx, (canvas.height - dh) / 2 + ty, dw, dh);
}
export function framingBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('无法生成图片')), 'image/png'));
}
