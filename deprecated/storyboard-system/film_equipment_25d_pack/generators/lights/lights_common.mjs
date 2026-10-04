// lights_common.mjs
// Shared component builders + material palettes for the 5 brand light fixtures.
// All coordinates in meters, Y up, origin at bottom-center.

import { box, cylinder } from './glb_builder.mjs';

// Material indices are resolved per-generator (each generator passes its own palette),
// so helpers accept a `mat` integer referencing the material slot.

export const PALETTES = {
  arri: {
    body:   { name: 'arri_blue_silver', baseColorFactor: [0.17, 0.23, 0.33, 1], metallicFactor: 0.55, roughnessFactor: 0.45 },
    lens:   { name: 'arri_diffuser',    baseColorFactor: [0.86, 0.89, 0.93, 1], metallicFactor: 0.0,  roughnessFactor: 0.65 },
    yoke:   { name: 'arri_yoke',        baseColorFactor: [0.13, 0.15, 0.19, 1], metallicFactor: 0.7,  roughnessFactor: 0.4 },
    metal:  { name: 'silver_pin',      baseColorFactor: [0.72, 0.74, 0.78, 1], metallicFactor: 0.9,  roughnessFactor: 0.3 },
  },
  aputure: {
    body:   { name: 'aputure_black',    baseColorFactor: [0.05, 0.05, 0.07, 1], metallicFactor: 0.35, roughnessFactor: 0.5 },
    lens:   { name: 'aputure_glass',    baseColorFactor: [0.10, 0.11, 0.14, 1], metallicFactor: 0.2,  roughnessFactor: 0.15, emissiveFactor: [0.02, 0.03, 0.05] },
    yoke:   { name: 'aputure_yoke',     baseColorFactor: [0.08, 0.08, 0.10, 1], metallicFactor: 0.6,  roughnessFactor: 0.45 },
    metal:  { name: 'silver_pin',       baseColorFactor: [0.72, 0.74, 0.78, 1], metallicFactor: 0.9,  roughnessFactor: 0.3 },
  },
  nanlite: {
    body:   { name: 'nanlite_blueblack',baseColorFactor: [0.09, 0.11, 0.16, 1], metallicFactor: 0.4,  roughnessFactor: 0.5 },
    lens:   { name: 'nanlite_glass',    baseColorFactor: [0.12, 0.13, 0.16, 1], metallicFactor: 0.2,  roughnessFactor: 0.2 },
    yoke:   { name: 'nanlite_yoke',     baseColorFactor: [0.13, 0.14, 0.17, 1], metallicFactor: 0.65, roughnessFactor: 0.4 },
    metal:  { name: 'silver_pin',       baseColorFactor: [0.72, 0.74, 0.78, 1], metallicFactor: 0.9,  roughnessFactor: 0.3 },
  },
};

// Map palette object -> ordered material array; returns { materials, idx:{body,lens,yoke,metal} }
export function paletteMaterials(pal) {
  const order = ['body', 'lens', 'yoke', 'metal'];
  const materials = order.map((k) => pal[k]);
  const idx = {};
  order.forEach((k, i) => (idx[k] = i));
  return { materials, idx };
}

// Junior / baby pin receiver stub at the very bottom-center (Y from 0 up).
export function spigotPrim(mat, { r = 0.014, h = 0.10 } = {}) {
  return { material: mat, ...cylinder([0, h / 2, 0], r, h, 'y', 20) };
}

// U-shaped yoke frame sized to an outer envelope (envW/H/D in meters).
// Body is expected to be centered near the middle of the envelope.
export function yokePrims(mat, { envW, envH, envD, armT = 0.022, topBar = true }) {
  const prims = [];
  const yb = 0.10;                 // yoke bottom (above spigot)
  const yt = envH - 0.012;         // yoke top
  const armH = yt - yb;
  const armCy = (yb + yt) / 2;
  // two side arms
  for (const sx of [-1, 1]) {
    prims.push({ material: mat, ...box([sx * (envW / 2 - armT / 2), armCy, 0], [armT, armH, envD]) });
  }
  // bottom bars front & back connecting the arms
  prims.push({ material: mat, ...box([0, yb + armT / 2, -envD / 2 + armT / 2], [envW, armT, armT]) });
  prims.push({ material: mat, ...box([0, yb + armT / 2, envD / 2 - armT / 2], [envW, armT, armT]) });
  if (topBar) {
    prims.push({ material: mat, ...box([0, yt - armT / 2, 0], [envW, armT, envD * 0.5]) });
  }
  return prims;
}

// Round Fresnel / lens recessed into the front face of a body.
// zFront = front Z of the body; r = lens radius; depth = lens thickness.
export function frontLensPrim(mat, { r, depth, zFront, cy, proud = 0.004 }) {
  const zc = zFront - depth / 2 + proud;
  return { material: mat, ...cylinder([0, cy, zc], r, depth, 'z', 36) };
}

// Shallow Bowens-mount throat ring at the front of a spotlight head.
export function bowensRingPrim(mat, { rOuter, rInner, depth, zFront, cy }) {
  // approximate with a short wide cylinder (the mount collar); hollow look via thin profile
  const zc = zFront - depth / 2 + 0.002;
  return { material: mat, ...cylinder([0, cy, zc], rOuter, depth, 'z', 32) };
}
