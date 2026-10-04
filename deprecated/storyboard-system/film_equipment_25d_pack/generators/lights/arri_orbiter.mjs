// arri_orbiter.mjs  — ARRI Orbiter procedural GLB generator
// Round LED spotlight: cylindrical barrel + front lens + Junior-pin yoke. Clearly round, distinct from the rest.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeModel, cylinder as cyl } from './glb_builder.mjs';
import { PALETTES, paletteMaterials, spigotPrim, yokePrims, frontLensPrim } from './lights_common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const GLB_OUT = resolve(ROOT, 'static/assets/glb/arri_orbiter.glb');
const SPEC_OUT = resolve(ROOT, 'film_equipment_25d_pack/metadata/replica_specs/arri_orbiter.json');

const slug = 'arri_orbiter';
const { materials, idx } = paletteMaterials(PALETTES.arri);

// ARRI Orbiter: ~400mm-class round barrel, ~330mm depth, 400W, 28mm Junior Pin.
const barrelR = 0.20;       // diameter ~400mm
const barrelD = 0.33;       // depth along Z
const barrelBottom = 0.02;
const cy = barrelBottom + barrelR;        // center Y
const zFront = barrelD / 2;

const envW = 0.44, envH = 0.44, envD = barrelD;

const primitives = [];
// round barrel (axis Z)
primitives.push({ material: idx.body, ...cyl([0, cy, 0], barrelR, barrelD, 'z', 40) });
// front lens (round)
primitives.push(frontLensPrim(idx.lens, { r: 0.17, depth: 0.04, zFront, cy, proud: 0.006 }));
// Junior-pin yoke sized to the round envelope
primitives.push(...yokePrims(idx.yoke, { envW, envH, envD, armT: 0.025, topBar: true }));
primitives.push(spigotPrim(idx.metal, { r: 0.014, h: 0.10 }));

const { bytes, bbox } = writeModel({ outPath: GLB_OUT, name: slug, materials, primitives });

const spec = {
  presetKey: 'light/arri_orbiter',
  manufacturer: 'ARRI',
  model: 'Orbiter',
  powerW: 400,
  weightKg: 11.7,
  dimensionsMm: {
    body: { w: 400, h: 400, d: 330 },
    withYoke: { w: 0, h: 0, d: 0 },
  },
  mount: '28mm Junior Pin (Spigot)',
  glb: 'arri_orbiter.glb',
  sourceUrls: ['https://www.arri.com/en/lighting/led/orbiter/tech-specs'],
  sourceVerified: true,
  notes: 'Official ARRI tech-specs: 400W nominal (500W max), 28mm Spigot (Junior Pin), fixture-only ~11.7kg. Orbiter body (state of delivery) ~309x330x410mm per ARRI manual; "barrel diameter ~400mm class" per verified internal dims. GLB models a round barrel (dia 400mm, depth 330mm) + Junior-pin yoke. withYoke not separately published -> left 0; bbox compared against body/barrel dims.',
};
writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));

const cm = bbox.size.map((v) => +(v * 100).toFixed(1));
console.log(`[${slug}] bytes=${bytes} predicted_bbox_cm=${JSON.stringify(cm)} (WxHxD)`);
