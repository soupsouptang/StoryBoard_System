// aputure_storm_1200x.mjs  — Aputure STORM 1200x procedural GLB generator
// Square point-source head + recessed round Fresnel lens + long yoke. Distinct shape.
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeModel, box } from './glb_builder.mjs';
import { PALETTES, paletteMaterials, spigotPrim, yokePrims, frontLensPrim } from './lights_common.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const GLB_OUT = resolve(ROOT, 'static/assets/glb/aputure_storm_1200x.glb');
const SPEC_OUT = resolve(ROOT, 'film_equipment_25d_pack/metadata/replica_specs/aputure_storm_1200x.json');

const slug = 'aputure_storm_1200x';
const { materials, idx } = paletteMaterials(PALETTES.aputure);

// Verified official dims (Aputure): head 334x336x250; with-yoke 334x336x557 (mm)
const envW = 0.334, envH = 0.336, envD = 0.557;
const bodyW = 0.334, bodyH = 0.336, bodyD = 0.250;
const cy = envH / 2;            // body centered in envelope height
const zFront = bodyD / 2;      // front face z

const primitives = [];
primitives.push({ material: idx.body, ...box([0, cy, 0], [bodyW, bodyH, bodyD]) });
// recessed round Fresnel lens at the front (recognizable STORM feature)
primitives.push(frontLensPrim(idx.lens, { r: 0.115, depth: 0.05, zFront, cy, proud: 0.006 }));
// long yoke frame (depth 557mm dominated by yoke)
primitives.push(...yokePrims(idx.yoke, { envW, envH, envD, armT: 0.025, topBar: true }));
primitives.push(spigotPrim(idx.metal, { r: 0.014, h: 0.10 }));

const { bytes, bbox } = writeModel({ outPath: GLB_OUT, name: slug, materials, primitives });

const spec = {
  presetKey: 'light/aputure_storm_1200x',
  manufacturer: 'Aputure',
  model: 'STORM 1200x',
  powerW: 1200,
  weightKg: 9.5,
  dimensionsMm: {
    body: { w: 334, h: 336, d: 250 },
    withYoke: { w: 334, h: 336, d: 557 },
  },
  mount: 'ProLock Bowens Mount + 28mm Junior Pin',
  glb: 'aputure_storm_1200x.glb',
  sourceUrls: ['https://www.aputure.com/en-US/products/storm-1200x'],
  sourceVerified: true,
  notes: 'Official Aputure product page. Head 334x336x250mm; with yoke 334x336x557mm; 1200W max output (1550W max consumption); 9.5kg with yoke. Modeled as square point-source head + recessed Fresnel lens + long yoke.',
};
writeFileSync(SPEC_OUT, JSON.stringify(spec, null, 2));

const cm = bbox.size.map((v) => +(v * 100).toFixed(1));
console.log(`[${slug}] bytes=${bytes} predicted_bbox_cm=${JSON.stringify(cm)} (WxHxD)`);
