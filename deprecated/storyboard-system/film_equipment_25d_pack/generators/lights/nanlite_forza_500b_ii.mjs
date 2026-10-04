// nanlite_forza_500b_ii.mjs  — Nanlite Forza 500B II procedural GLB generator
// Same family as 300B II but larger (400x230x142mm). Different size makes them non-interchangeable.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeModel, box } from './glb_builder.mjs';
import { PALETTES, paletteMaterials, spigotPrim, yokePrims, frontLensPrim, bowensRingPrim } from './lights_common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const GLB_OUT = resolve(ROOT, 'static/assets/glb/nanlite_forza_500b_ii.glb');
const SPEC_OUT = resolve(ROOT, 'film_equipment_25d_pack/metadata/replica_specs/nanlite_forza_500b_ii.json');

const slug = 'nanlite_forza_500b_ii';
const { materials, idx } = paletteMaterials(PALETTES.nanlite);

// Verified head dims (Nanlite): 400x230x142 mm
const bodyW = 0.400, bodyH = 0.230, bodyD = 0.142;
const bodyBottom = 0.02;
const cy = bodyBottom + bodyH / 2;
const zFront = bodyD / 2;

const envW = 0.45, envH = 0.265, envD = bodyD;

const primitives = [];
primitives.push({ material: idx.body, ...box([0, cy, 0], [bodyW, bodyH, bodyD]) });
primitives.push(frontLensPrim(idx.lens, { r: 0.10, depth: 0.05, zFront, cy, proud: 0.012 }));
primitives.push(bowensRingPrim(idx.yoke, { rOuter: 0.105, depth: 0.02, zFront, cy }));
primitives.push(...yokePrims(idx.yoke, { envW, envH, envD, armT: 0.02, topBar: true }));
primitives.push(spigotPrim(idx.metal, { r: 0.014, h: 0.10 }));

const { bytes, bbox } = writeModel({ outPath: GLB_OUT, name: slug, materials, primitives });

const spec = {
  presetKey: 'light/nanlite_forza_500b_ii',
  manufacturer: 'Nanlite',
  model: 'Forza 500B II',
  powerW: 580,
  weightKg: 4.34,
  dimensionsMm: {
    body: { w: 400, h: 230, d: 142 },
    withYoke: { w: 0, h: 0, d: 0 },
  },
  mount: 'Bowens S-Type',
  glb: 'nanlite_forza_500b_ii.glb',
  sourceUrls: [
    'https://www.focusnordic.com/products/video/led-lighting/fresnel-monolights/nanlite-forza-500b-ii-bicolor-led-spot-light',
    'https://www.rubbermonkey.co.nz/Nanlite-Forza-500B-II-Bi-Colour-LED-Monolight',
  ],
  sourceVerified: true,
  notes: 'Official nanlite.com product page was unreachable (HTTP 500) during build; dims taken from retailer specs (Focus Nordic, Rubber Monkey) which cite official Nanlite data and agree: head 400x230x142mm, 580W, 4.34kg, Bowens mount. withYoke dimension not separately published -> left 0. GLB includes a compact U-yoke; bbox compared against head dims.',
};
writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));

const cm = bbox.size.map((v) => +(v * 100).toFixed(1));
console.log(`[${slug}] bytes=${bytes} predicted_bbox_cm=${JSON.stringify(cm)} (WxHxD)`);
