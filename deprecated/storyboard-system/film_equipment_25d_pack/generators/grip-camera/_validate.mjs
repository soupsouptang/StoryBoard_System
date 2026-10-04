// _validate.mjs — Structural GLB validation + accessor-recomputed bounding box.
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
const report = [];
for (const f of files) {
  const buf = readFileSync(f);
  const magic = buf.toString("ascii", 0, 4);
  const version = buf.readUInt32LE(4);
  const total = buf.readUInt32LE(8);
  let line = `${f}\n  magic=${magic} version=${version} totalLen=${total} fileLen=${buf.length}`;
  let ok = magic === "glTF" && version === 2 && total === buf.length;

  // JSON chunk
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  let gltf;
  try { gltf = JSON.parse(jsonStr); line += `\n  jsonChunk OK (${jsonLen}B, type=0x${jsonType.toString(16)})`; }
  catch (e) { ok = false; line += `\n  JSON.parse FAILED: ${e.message}`; }

  if (gltf) {
    const binOffset = 20 + jsonLen + ((4 - (jsonLen % 4)) % 4);
    const binLen = buf.readUInt32LE(binOffset);
    const binType = buf.readUInt32LE(binOffset + 4);
    const binStart = binOffset + 8;
    line += `\n  binChunk len=${binLen} type=0x${binType.toString(16)} (expected BIN\\0=0x${0x004E4942.toString(16)})`;

    // gather POSITION accessors, recompute bbox
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let prims = 0;
    for (const mesh of gltf.meshes) for (const prim of mesh.primitives) {
      prims++;
      const pa = gltf.accessors[prim.attributes.POSITION];
      const bv = gltf.bufferViews[pa.bufferView];
      const o = binStart + bv.byteOffset;
      const pmin = [Infinity, Infinity, Infinity], pmax = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pa.count; i++) {
        const x = buf.readFloatLE(o + i * 12);
        const y = buf.readFloatLE(o + i * 12 + 4);
        const z = buf.readFloatLE(o + i * 12 + 8);
        if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
        if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
        if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
        if (x < pmin[0]) pmin[0] = x; if (x > pmax[0]) pmax[0] = x;
        if (y < pmin[1]) pmin[1] = y; if (y > pmax[1]) pmax[1] = y;
        if (z < pmin[2]) pmin[2] = z; if (z > pmax[2]) pmax[2] = z;
      }
      // sanity: declared per-primitive min/max must match recomputed (within float tolerance)
      const dm = pa.min, dM = pa.max;
      if (dm && (Math.abs(dm[0] - pmin[0]) > 1e-3 || Math.abs(dm[1] - pmin[1]) > 1e-3 ||
                 Math.abs(dM[0] - pmax[0]) > 1e-3 || Math.abs(dM[1] - pmax[1]) > 1e-3 ||
                 Math.abs(dm[2] - pmin[2]) > 1e-3 || Math.abs(dM[2] - pmax[2]) > 1e-3)) ok = false;
    }
    const sizeCm = [(max[0]-min[0])*100, (max[1]-min[1])*100, (max[2]-min[2])*100].map(v=>v.toFixed(1));
    line += `\n  primitives=${prims}  recomputed bbox(cm) WxHxD = ${sizeCm[0]} x ${sizeCm[1]} x ${sizeCm[2]}`;
    line += `\n  yRange(m) ${min[1].toFixed(3)}..${max[1].toFixed(3)} (origin at bottom: min.y ~ 0 -> ${(min[1]===0||Math.abs(min[1])<1e-3)?'OK':'CHECK'})`;
    if (!(min[1] >= -1e-3)) ok = false;
  }
  line += `\n  RESULT: ${ok ? "PASS" : "FAIL"}\n`;
  report.push(line);
}
writeFileSync("_validate.txt", report.join("\n"));
console.log(report.join("\n"));
