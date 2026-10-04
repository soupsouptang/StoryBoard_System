// avenger_cstand_a2033f.mjs — Procedural GLB generator for the Avenger C-Stand 33" (A2033F).
// Pure Node, no dependencies, no Blender. Units: meters, Y up, origin at bottom-center.
//
// Adopted dimensions (internal:film_equipment_25d_pack/metadata — official page not reachable):
//   column max height 33" ~= 0.84 m (this is the "33" in the model name)
//   folded length ~1.34 m; base = 3 folding legs + top grip head (magic head) + grip arm
//   centre column diameters 35/30/25 mm; leg dia ~25 mm; 16 mm (5/8") spigot/pin

import { GeoBuilder, buildGLB } from "./_glb.mjs";
import { writeFileSync } from "node:fs";

const OUT = "static/assets/glb/avenger_cstand_a2033f.glb";

const MAT = { chrome: 0, head: 1, pin: 2 };
const materials = [
  { name: "chrome", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.78, 0.79, 0.82, 1], metallicFactor: 0.95, roughnessFactor: 0.25 } },
  { name: "head", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.18, 0.18, 0.20, 1], metallicFactor: 0.6, roughnessFactor: 0.5 } },
  { name: "pin", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.10, 0.10, 0.11, 1], metallicFactor: 0.5, roughnessFactor: 0.45 } },
];

const g = new GeoBuilder();

// --- three folding legs (turtle base -> floor, splayed) --------------------
const hubY = 0.10;          // where legs hinge on the column
const footR = 0.40;         // footprint radius (~0.80 m diameter)
const legR = 0.0125;        // ~25 mm dia
for (let i = 0; i < 3; i++) {
  const a = (i / 3) * Math.PI * 2;
  const fx = Math.cos(a) * footR, fz = Math.sin(a) * footR;
  g.cylinderBetween([0, hubY, 0], [fx, 0, fz], legR, 16, MAT.chrome);
  // little foot cap
  g.cylinderBetween([fx, 0.0, fz], [fx, 0.02, fz], legR * 1.3, 12, MAT.chrome);
}

// --- base hub / turtle base ------------------------------------------------
g.cylinderY(0.02, hubY, 0.028, 16, MAT.chrome);

// --- telescoping centre column (3 sections, diameters 35/30/25 mm) ---------
g.cylinderY(0.05, 0.38, 0.0175, 18, MAT.chrome);   // 35 mm
g.cylinderY(0.37, 0.62, 0.0150, 18, MAT.chrome);   // 30 mm
g.cylinderY(0.61, 0.80, 0.0125, 18, MAT.chrome);   // 25 mm

// --- top grip head (magic head): disc + clamp ------------------------------
const headY = 0.82;
g.cylinderY(headY - 0.015, headY + 0.015, 0.05, 20, MAT.head);   // disc
g.box(0, headY, 0, 0.10, 0.02, 0.04, MAT.head);                  // clamp body across disc
// 16 mm (5/8") spigot pin on top
g.cylinderY(headY + 0.015, headY + 0.045, 0.008, 12, MAT.pin);

// --- grip arm (magic arm) extending from the head --------------------------
const armY = headY;
const armEnd = [0.46, armY, 0];
g.cylinderBetween([0, armY, 0], armEnd, 0.008, 12, MAT.chrome);
// elbow + short dropper segment to look like a real grip arm
g.cylinderBetween(armEnd, [0.46, armY - 0.12, 0], 0.008, 12, MAT.chrome);
g.cylinderBetween([0.46, armY - 0.12, 0], [0.40, armY - 0.12, 0], 0.008, 12, MAT.chrome);
// small grip knob at free end
g.cylinderBetween([0.40, armY - 0.12, 0], [0.40, armY - 0.16, 0], 0.014, 12, MAT.pin);

// --- write GLB -------------------------------------------------------------
g.translateY(0.013);   // seat the lowest foot tip on y = 0 (leg end-caps splay below the axis)
const glb = buildGLB(g, materials);
writeFileSync(OUT, glb);

// --- report bounding box (cm) ---------------------------------------------
const bb = g.bbox();
const sizeCm = [
  ((bb.max[0] - bb.min[0]) * 100).toFixed(1),
  ((bb.max[1] - bb.min[1]) * 100).toFixed(1),
  ((bb.max[2] - bb.min[2]) * 100).toFixed(1),
];
console.log(`[avenger_cstand_a2033f] wrote ${OUT} (${glb.length} bytes)`);
console.log(`[avenger_cstand_a2033f] bbox size (cm) WxHxD = ${sizeCm[0]} x ${sizeCm[1]} x ${sizeCm[2]}`);
console.log(`[avenger_cstand_a2033f] bbox min(m) = ${bb.min.map(v => v.toFixed(3))}  max(m) = ${bb.max.map(v => v.toFixed(3))}`);
