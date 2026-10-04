// glb_builder.mjs
// Minimal hand-written glTF 2.0 GLB exporter. Pure Node, no dependencies, no Blender.
// Units: meters. Y up. Origin at bottom-center of the assembled model.
// Produces geometry by assembling primitives (box / cylinder) baked in world space.

import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------- geometry
// Each helper returns { positions:[...], normals:[...], indices:[...] } (local, 0-based).

export function box(center, size) {
  const [cx, cy, cz] = center;
  const hx = size[0] / 2, hy = size[1] / 2, hz = size[2] / 2;
  const p = [], n = [], idx = [];
  // CCW outward faces (verified right-hand rule)
  const faces = [
    { nr: [1, 0, 0],  v: [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]] },
    { nr: [-1, 0, 0], v: [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]] },
    { nr: [0, 1, 0],  v: [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
    { nr: [0, -1, 0], v: [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]] },
    { nr: [0, 0, 1],  v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { nr: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
  ];
  for (const f of faces) {
    const base = p.length / 3;
    for (const vert of f.v) {
      p.push(cx + vert[0], cy + vert[1], cz + vert[2]);
      n.push(f.nr[0], f.nr[1], f.nr[2]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions: p, normals: n, indices: idx };
}

export function cylinder(center, radius, height, axis = 'z', seg = 36) {
  const [cx, cy, cz] = center;
  let A, U, V;
  if (axis === 'z') { A = [0, 0, 1]; U = [1, 0, 0]; V = [0, 1, 0]; }
  else if (axis === 'y') { A = [0, 1, 0]; U = [1, 0, 0]; V = [0, 0, 1]; }
  else { A = [1, 0, 0]; U = [0, 1, 0]; V = [0, 0, 1]; }
  const positions = [], normals = [], indices = [];
  const hh = height / 2;
  const ringBot = [], ringTop = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const rx = U[0] * c + V[0] * s, ry = U[1] * c + V[1] * s, rz = U[2] * c + V[2] * s;
    positions.push(cx + rx * radius - A[0] * hh, cy + ry * radius - A[1] * hh, cz + rz * radius - A[2] * hh);
    normals.push(rx, ry, rz);
    ringBot.push(positions.length / 3 - 1);
    positions.push(cx + rx * radius + A[0] * hh, cy + ry * radius + A[1] * hh, cz + rz * radius + A[2] * hh);
    normals.push(rx, ry, rz);
    ringTop.push(positions.length / 3 - 1);
  }
  for (let i = 0; i < seg; i++) {
    const b0 = ringBot[i], b1 = ringBot[i + 1], t1 = ringTop[i + 1], t0 = ringTop[i];
    indices.push(b0, b1, t1, b0, t1, t0);
  }
  const cBot = positions.length / 3;
  positions.push(cx - A[0] * hh, cy - A[1] * hh, cz - A[2] * hh);
  normals.push(-A[0], -A[1], -A[2]);
  const cTop = positions.length / 3;
  positions.push(cx + A[0] * hh, cy + A[1] * hh, cz + A[2] * hh);
  normals.push(A[0], A[1], A[2]);
  for (let i = 0; i < seg; i++) {
    indices.push(cBot, ringBot[i + 1], ringBot[i]);
    indices.push(cTop, ringTop[i], ringTop[i + 1]);
  }
  return { positions, normals, indices };
}

// ---------------------------------------------------------------- bbox
export function bboxOf(primitives) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const prim of primitives) {
    const p = prim.positions;
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = p[i + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

// ---------------------------------------------------------------- GLB assembly
export function buildGLB({ name, materials, primitives }) {
  const accessors = [];
  const bufferViews = [];
  const binParts = [];
  let bufferOffset = 0;

  function pad4() {
    const pad = (4 - (bufferOffset % 4)) % 4;
    if (pad) { binParts.push(Buffer.alloc(pad)); bufferOffset += pad; }
  }
  function addView(typedArray, target) {
    pad4();
    const bytes = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const idx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: bufferOffset, byteLength: bytes.length, target });
    binParts.push(bytes);
    bufferOffset += bytes.length;
    return idx;
  }

  const meshPrimitives = [];
  for (const prim of primitives) {
    const pos = new Float32Array(prim.positions);
    const nor = new Float32Array(prim.normals);
    if (pos.length / 3 > 65535) throw new Error('too many vertices for uint16 indices');
    const idx = new Uint16Array(prim.indices);
    const posBV = addView(pos, 34962);
    const norBV = addView(nor, 34962);
    const idxBV = addView(idx, 34963);
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = pos[i + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    const posAcc = accessors.length;
    accessors.push({ bufferView: posBV, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max });
    const norAcc = accessors.length;
    accessors.push({ bufferView: norBV, componentType: 5126, count: nor.length / 3, type: 'VEC3' });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxBV, componentType: 5123, count: idx.length, type: 'SCALAR' });
    meshPrimitives.push({
      attributes: { POSITION: posAcc, NORMAL: norAcc },
      indices: idxAcc,
      material: prim.material,
    });
  }
  pad4();
  const bin = Buffer.concat(binParts);

  const gltf = {
    asset: { version: '2.0', generator: 'frameforge-procedural-lights' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: meshPrimitives }],
    materials: materials.map((m, i) => ({
      name: m.name || ('mat' + i),
      pbrMetallicRoughness: {
        baseColorFactor: m.baseColorFactor || [0.8, 0.8, 0.8, 1],
        metallicFactor: m.metallicFactor == null ? 0.1 : m.metallicFactor,
        roughnessFactor: m.roughnessFactor == null ? 0.7 : m.roughnessFactor,
      },
      ...(m.emissiveFactor ? { emissiveFactor: m.emissiveFactor } : {}),
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  const jsonBuf = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}

export function writeModel({ outPath, name, materials, primitives }) {
  const glb = buildGLB({ name, materials, primitives });
  writeFileSync(outPath, glb);
  const bb = bboxOf(primitives);
  return { bytes: glb.length, bbox: bb };
}
