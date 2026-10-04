// arri_alexa_35.mjs — Procedural GLB generator for the ARRI ALEXA 35 cinema camera.
// Pure Node, no dependencies, no Blender. Units: meters, Y up, origin at bottom-center.
//
// Adopted dimensions (internal:film_equipment_25d_pack/metadata — official ARRI page
// was not reachable; values are the project-verified body size excluding lens/viewfinder):
//   body W x H x D = 138 x 152 x 188 mm
//   lens mount: LPL (also accepts PL via adapter); top carry handle present.

import { GeoBuilder, buildGLB } from "./_glb.mjs";
import { writeFileSync } from "node:fs";

const OUT = "static/assets/glb/arri_alexa_35.glb";

// --- materials -------------------------------------------------------------
const MAT = {
  body: 0,    // dark camera body
  metal: 1,   // handle / mount ring (metal)
  glass: 2,   // lens barrel / glass
  accent: 3,  // red record indicator
};
const materials = [
  { name: "body", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.11, 0.11, 0.12, 1], metallicFactor: 0.55, roughnessFactor: 0.55 } },
  { name: "metal", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.55, 0.56, 0.58, 1], metallicFactor: 0.9, roughnessFactor: 0.35 } },
  { name: "glass", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.04, 0.04, 0.05, 1], metallicFactor: 0.3, roughnessFactor: 0.18 } },
  { name: "accent", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.72, 0.06, 0.06, 1], metallicFactor: 0.1, roughnessFactor: 0.5 } },
];

const g = new GeoBuilder();

// --- body (box) ------------------------------------------------------------
const W = 0.138, H = 0.152, D = 0.188;
const bodyY = H / 2;                 // bottom at y=0
g.box(0, bodyY, 0, W, H, D, MAT.body);

// --- top carry handle (two posts + cross bar) ------------------------------
const handleTop = H + 0.052;
const postX = 0.045, postZ = 0;
g.box(postX, (H + handleTop) / 2, postZ, 0.018, handleTop - H, 0.018, MAT.metal);
g.box(-postX, (H + handleTop) / 2, postZ, 0.018, handleTop - H, 0.018, MAT.metal);
g.box(0, handleTop, postZ, 2 * postX + 0.018, 0.022, 0.022, MAT.metal); // grip bar

// --- front LPL mount + lens barrel (cylinders along +Z) --------------------
const frontZ = D / 2;
const mountR = 0.034, mountLen = 0.030;     // short mount ring
g.cylinderBetween([0, bodyY, frontZ], [0, bodyY, frontZ + mountLen], mountR, 28, MAT.metal);
const lensR = 0.046, lensLen = 0.105;        // protruding lens barrel
g.cylinderBetween([0, bodyY, frontZ + mountLen], [0, bodyY, frontZ + mountLen + lensLen], lensR, 28, MAT.glass);
// front lens glass ring (slightly recessed, darker)
g.cylinderBetween([0, bodyY, frontZ + mountLen + lensLen - 0.004], [0, bodyY, frontZ + mountLen + lensLen], lensR * 0.8, 28, MAT.glass);

// --- MVF-style viewfinder monitor on top-back ------------------------------
g.box(0, H + 0.028, -D * 0.28, 0.075, 0.052, 0.030, MAT.metal);

// --- small red record button on top-front ----------------------------------
g.box(0.04, H + 0.010, D * 0.30, 0.018, 0.012, 0.018, MAT.accent);

// --- side grip / detail block on right side --------------------------------
g.box(W / 2 + 0.006, bodyY - 0.01, 0, 0.012, 0.05, 0.06, MAT.body);

// --- write GLB -------------------------------------------------------------
const glb = buildGLB(g, materials);
writeFileSync(OUT, glb);

// --- report bounding box (cm) ---------------------------------------------
const bb = g.bbox();
const sizeCm = [
  ((bb.max[0] - bb.min[0]) * 100).toFixed(1),
  ((bb.max[1] - bb.min[1]) * 100).toFixed(1),
  ((bb.max[2] - bb.min[2]) * 100).toFixed(1),
];
console.log(`[arri_alexa_35] wrote ${OUT} (${glb.length} bytes)`);
console.log(`[arri_alexa_35] bbox size (cm) WxHxD = ${sizeCm[0]} x ${sizeCm[1]} x ${sizeCm[2]}`);
console.log(`[arri_alexa_35] bbox min(m) = ${bb.min.map(v => v.toFixed(3))}  max(m) = ${bb.max.map(v => v.toFixed(3))}`);
