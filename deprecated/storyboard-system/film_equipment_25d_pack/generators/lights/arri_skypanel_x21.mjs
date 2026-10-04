// arri_skypanel_x21.mjs  — ARRI SkyPanel X21 procedural GLB generator
// Flat LED panel (2:1) + manual yoke + 28mm spigot. Distinct from the others.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeModel, box } from './glb_builder.mjs';
import { PALETTES, paletteMaterials, spigotPrim, yokePrims } from './lights_common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const GLB_OUT = resolve(ROOT, 'static/assets/glb/arri_skypanel_x21.glb');
const SPEC_OUT = resolve(ROOT, 'film_equipment_25d_pack/metadata/replica_specs/arri_skypanel_x21.json');

const slug = 'arri_skypanel_x21';
const { materials, idx } = paletteMaterials(PALETTES.arri);

// Verified official dims (ARRI): body 738x339x154, with-yoke 875x588x170 (mm)
const envW = 0.875, envH = 0.588, envD = 0.170;
const bodyW = 0.738, bodyH = 0.339, bodyD = 0.154;

const primitives = [];
// panel body
primitives.push({ material: idx.body, ...box([0, envH / 2, 0], [bodyW, bodyH, bodyD]) });
// white diffuser face (proud of front)
primitives.push({ material: idx.lens, ...box([0, envH / 2, bodyD / 2 + 0.006], [bodyW * 0.95, bodyH * 0.88, 0.02]) });
// manual yoke frame
primitives.push(...yokePrims(idx.yoke, { envW, envH, envD, armT: 0.03, topBar: true }));
// 28mm spigot at bottom center
primitives.push(spigotPrim(idx.metal, { r: 0.014, h: 0.10 }));

const { bytes, bbox } = writeModel({ outPath: GLB_OUT, name: slug, materials, primitives });

const spec = {
  presetKey: 'light/arri_skypanel_x21',
  manufacturer: 'ARRI',
  model: 'SkyPanel X21',
  powerW: 800,
  weightKg: 18.0,
  dimensionsMm: {
    body: { w: 738, h: 339, d: 154 },
    withYoke: { w: 875, h: 588, d: 170 },
  },
  mount: '28mm Spigot (Junior Pin)',
  glb: 'arri_skypanel_x21.glb',
  sourceUrls: ['https://www.arri.com/en/lighting/led/skypanel/x-series/tech-data'],
  sourceVerified: true,
  notes: 'Official ARRI tech-data page. Body 738x339x154mm; with manual yoke 875x588x170mm; 800W; ~18kg with yoke. Modeled as flat 2:1 LED panel + manual yoke + 28mm spigot.',
};
writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));

const cm = bbox.size.map((v) => +(v * 100).toFixed(1));
console.log(`[${slug}] bytes=${bytes} predicted_bbox_cm=${JSON.stringify(cm)} (WxHxD)`);
