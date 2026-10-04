// nanlite_forza_300b_ii.mjs  — Nanlite Forza 300B II procedural GLB generator
// Compact reflector spotlight head + Bowens throat + compact U-yoke. Smaller of the two Forzas.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeModel, box } from './glb_builder.mjs';
import { PALETTES, paletteMaterials, spigotPrim, yokePrims, frontLensPrim, bowensRingPrim } from './lights_common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const GLB_OUT = resolve(ROOT, 'static/assets/glb/nanlite_forza_300b_ii.glb');
const SPEC_OUT = resolve(ROOT, 'film_equipment_25d_pack/metadata/replica_specs/nanlite_forza_300b_ii.json');

const slug = 'nanlite_forza_300b_ii';
const { materials, idx } = paletteMaterials(PALETTES.nanlite);

// Verified head dims (Nanlite): 330x228x123 mm
const bodyW = 0.330, bodyH = 0.228, bodyD = 0.123;
const bodyBottom = 0.02;
const cy = bodyBottom + bodyH / 2;
const zFront = bodyD / 2;

const envW = 0.37, envH = 0.26, envD = bodyD;

const primitives = [];
primitives.push({ material: idx.body, ...box([0, cy, 0], [bodyW, bodyH, bodyD]) });
// round COB reflector / lens at front
primitives.push(frontLensPrim(idx.lens, { r: 0.085, depth: 0.05, zFront, cy, proud: 0.012 }));
// Bowens mount collar
primitives.push(bowensRingPrim(idx.yoke, { rOuter: 0.09, depth: 0.02, zFront, cy }));
// compact yoke
primitives.push(...yokePrims(idx.yoke, { envW, envH, envD, armT: 0.02, topBar: true }));
primitives.push(spigotPrim(idx.metal, { r: 0.014, h: 0.10 }));

const { bytes, bbox } = writeModel({ outPath: GLB_OUT, name: slug, materials, primitives });

const spec = {
  presetKey: 'light/nanlite_forza_300b_ii',
  manufacturer: 'Nanlite',
  model: 'Forza 300B II',
  powerW: 350,
  weightKg: 2.9,
  dimensionsMm: {
    body: { w: 330, h: 228, d: 123 },
    withYoke: { w: 0, h: 0, d: 0 },
  },
  mount: 'Bowens S-Type',
  glb: 'nanlite_forza_300b_ii.glb',
  sourceUrls: [
    'https://www.focusnordic.com/products/video/led-lighting/fresnel-monolights/nanlite-forza-300b-ii-bicolor-led-spot-light',
    'https://www.trm.fr?p=172148/',
  ],
  sourceVerified: true,
  notes: 'Official nanlite.com product page was unreachable (HTTP 500) during build; dims taken from retailer specs (Focus Nordic, TRM) which cite official Nanlite data and agree: head 330x228x123mm, 350W, 2.9kg, Bowens mount. withYoke dimension not separately published by manufacturer -> left 0. GLB includes a compact U-yoke; bbox compared against head dims.',
};
writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));

const cm = bbox.size.map((v) => +(v * 100).toFixed(1));
console.log(`[${slug}] bytes=${bytes} predicted_bbox_cm=${JSON.stringify(cm)} (WxHxD)`);
