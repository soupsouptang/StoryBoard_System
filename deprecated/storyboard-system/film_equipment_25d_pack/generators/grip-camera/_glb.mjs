// _glb.mjs — Pure-Node procedural GLB 2.0 writer (no dependencies, no Blender).
// Produces a binary glTF: magic "glTF", JSON chunk + BIN chunk, 4-byte aligned.
// Coordinate convention used by callers: meters, Y up, origin at bottom-center.

const COMPONENT_FLOAT = 5126;
const COMPONENT_UINT = 5125;

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// Accumulates geometry "parts" (each part = one primitive with its own material).
export class GeoBuilder {
  constructor() {
    this.parts = [];
  }

  _addPart(pos, nrm, idx, mat) {
    this.parts.push({ pos, nrm, idx, mat });
  }

  // Axis-aligned box centered at (cx,cy,cz) with full sizes (sx,sy,sz).
  box(cx, cy, cz, sx, sy, sz, mat) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2;
    const y0 = cy - sy / 2, y1 = cy + sy / 2;
    const z0 = cz - sz / 2, z1 = cz + sz / 2;
    const faces = [
      [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
      [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]],
      [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]],
      [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
      [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]],
      [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    ];
    const p = [], n = [], idx = [];
    for (const [nv, corners] of faces) {
      const base = p.length / 3;
      for (const c of corners) { p.push(c[0], c[1], c[2]); n.push(nv[0], nv[1], nv[2]); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    this._addPart(p, n, idx, mat);
  }

  // Cylinder whose axis runs from p0 to p1, radius r, with end caps.
  cylinderBetween(p0, p1, r, seg, mat) {
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    const L = Math.hypot(ax, ay, az) || 1e-6;
    const d = [ax / L, ay / L, az / L];
    const up = Math.abs(d[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(up, d));
    const v = cross(d, u);
    const p = [], n = [], idx = [];
    // side
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const nx = c * u[0] + s * v[0], ny = c * u[1] + s * v[1], nz = c * u[2] + s * v[2];
      p.push(p0[0] + r * nx, p0[1] + r * ny, p0[2] + r * nz); n.push(nx, ny, nz);
      p.push(p1[0] + r * nx, p1[1] + r * ny, p1[2] + r * nz); n.push(nx, ny, nz);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2, b = i * 2 + 1, cc = i * 2 + 2, dd = i * 2 + 3;
      idx.push(a, b, cc, b, dd, cc);
    }
    // bottom cap (normal -d)
    const c0 = p.length / 3; p.push(p0[0], p0[1], p0[2]); n.push(-d[0], -d[1], -d[2]);
    const r0 = p.length / 3;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      p.push(p0[0] + r * (c * u[0] + s * v[0]), p0[1] + r * (c * u[1] + s * v[1]), p0[2] + r * (c * u[2] + s * v[2]));
      n.push(-d[0], -d[1], -d[2]);
    }
    for (let i = 0; i < seg; i++) idx.push(c0, r0 + i + 1, r0 + i);
    // top cap (normal +d)
    const c1 = p.length / 3; p.push(p1[0], p1[1], p1[2]); n.push(d[0], d[1], d[2]);
    const r1 = p.length / 3;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      p.push(p1[0] + r * (c * u[0] + s * v[0]), p1[1] + r * (c * u[1] + s * v[1]), p1[2] + r * (c * u[2] + s * v[2]));
      n.push(d[0], d[1], d[2]);
    }
    for (let i = 0; i < seg; i++) idx.push(c1, r1 + i, r1 + i + 1);
    this._addPart(p, n, idx, mat);
  }

  // Convenience: vertical cylinder along Y from y0 to y1.
  cylinderY(y0, y1, r, seg, mat) {
    this.cylinderBetween([0, y0, 0], [0, y1, 0], r, seg, mat);
  }

  // Shift all vertices vertically by dy (meters). Used to seat the model on y=0.
  translateY(dy) {
    for (const part of this.parts) {
      for (let i = 1; i < part.pos.length; i += 3) part.pos[i] += dy;
    }
  }

  // World-space bounding box across all parts, returns {min:[x,y,z], max:[x,y,z]} in meters.
  bbox() {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const part of this.parts) {
      for (let i = 0; i < part.pos.length; i += 3) {
        for (let k = 0; k < 3; k++) {
          const val = part.pos[i + k];
          if (val < min[k]) min[k] = val;
          if (val > max[k]) max[k] = val;
        }
      }
    }
    return { min, max };
  }
}

function appendBuf(bin, buf) {
  for (let i = 0; i < buf.length; i++) bin.push(buf[i]);
}

// Build a GLB Buffer from a GeoBuilder + materials array.
export function buildGLB(builder, materials) {
  const bin = [];
  const bufferViews = [];
  const accessors = [];
  const primitives = [];
  let byteOffset = 0;

  const align4 = () => { while (byteOffset % 4 !== 0) { bin.push(0); byteOffset++; } };

  for (const part of builder.parts) {
    const nVerts = part.pos.length / 3;

    align4();
    const posBytes = Buffer.from(new Float32Array(part.pos).buffer);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: posBytes.length, target: 34962 });
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < nVerts; i++) {
      for (let k = 0; k < 3; k++) {
        const val = part.pos[i * 3 + k];
        if (val < min[k]) min[k] = val;
        if (val > max[k]) max[k] = val;
      }
    }
    accessors.push({ bufferView: bufferViews.length - 1, componentType: COMPONENT_FLOAT, count: nVerts, type: "VEC3", min, max });
    appendBuf(bin, posBytes); byteOffset += posBytes.length;

    align4();
    const nrmBytes = Buffer.from(new Float32Array(part.nrm).buffer);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: nrmBytes.length, target: 34962 });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: COMPONENT_FLOAT, count: nVerts, type: "VEC3" });
    appendBuf(bin, nrmBytes); byteOffset += nrmBytes.length;

    align4();
    const idxBytes = Buffer.from(new Uint32Array(part.idx).buffer);
    bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBytes.length, target: 34963 });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: COMPONENT_UINT, count: part.idx.length, type: "SCALAR" });
    appendBuf(bin, idxBytes); byteOffset += idxBytes.length;

    primitives.push({
      attributes: { POSITION: accessors.length - 3, NORMAL: accessors.length - 2 },
      indices: accessors.length - 1,
      material: part.mat,
    });
  }

  align4();
  const binBuffer = Buffer.from(bin);
  const binPad = (4 - (binBuffer.length % 4)) % 4;
  const binChunkLen = binBuffer.length + binPad;

  const gltf = {
    asset: { version: "2.0", generator: "film_equipment_25d_pack procedural GLB (pure Node)" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "equipment" }],
    meshes: [{ primitives }],
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.length }],
    materials,
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBytes = Buffer.from(jsonStr, "utf8");
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunkLen = jsonBytes.length + jsonPad;

  const total = 12 + 8 + jsonChunkLen + 8 + binChunkLen;
  const out = Buffer.alloc(total);
  let o = 0;
  out.write("glTF", 0, "ascii"); o += 4;
  out.writeUInt32LE(2, o); o += 4;          // version
  out.writeUInt32LE(total, o); o += 4;       // total length
  out.writeUInt32LE(jsonChunkLen, o); o += 4;
  out.writeUInt32LE(0x4E4F534A, o); o += 4;  // 'JSON'
  jsonBytes.copy(out, o); o += jsonBytes.length;
  for (let i = 0; i < jsonPad; i++) out[o++] = 0x20;
  out.writeUInt32LE(binChunkLen, o); o += 4;
  out.writeUInt32LE(0x004E4942, o); o += 4;  // 'BIN\0'
  binBuffer.copy(out, o); o += binBuffer.length;
  for (let i = 0; i < binPad; i++) out[o++] = 0;

  return out;
}
