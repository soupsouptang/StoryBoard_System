#!/usr/bin/env python3
"""Screenshot-based visual regression using compact perceptual fingerprints."""

from __future__ import annotations
import argparse, base64, json, zlib
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]

def thumb(path: Path) -> bytes:
    with Image.open(path) as image:
        gray=image.convert("L").resize((32,32),Image.Resampling.LANCZOS)
        return bytes(gray.getdata())

def edge(values: bytes) -> list[int]:
    vals=list(values); out=[]
    for y in range(32):
        for x in range(31): out.append(abs(vals[y*32+x+1]-vals[y*32+x]))
    for y in range(31):
        for x in range(32): out.append(abs(vals[(y+1)*32+x]-vals[y*32+x]))
    return out

def mae(a,b) -> float:
    return sum(abs(int(x)-int(y)) for x,y in zip(a,b))/len(a)

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--screens",type=Path,default=ROOT/".artifacts/ui/screens")
    ap.add_argument("--baseline",type=Path,default=ROOT/".frameforge/visual-baseline.json")
    args=ap.parse_args()
    baseline=json.loads(args.baseline.read_text(encoding="utf-8"))
    tmax=float(baseline["thresholds"]["thumbnail_mae"]); emax=float(baseline["thresholds"]["edge_mae"])
    report={"source_run":baseline["source_run"],"thresholds":baseline["thresholds"],"screens":{}}
    errors=[]
    for name,spec in baseline["screens"].items():
        path=args.screens/name
        if not path.is_file():
            errors.append(f"missing screenshot: {name}"); continue
        with Image.open(path) as im:
            dims=(im.width,im.height)
        expected=(spec["width"],spec["height"])
        if dims!=expected:
            errors.append(f"{name}: dimensions {dims} != baseline {expected}"); continue
        current=thumb(path)
        reference=zlib.decompress(base64.b64decode(spec["thumb_zlib_b64"]))
        tm=mae(current,reference); em=mae(edge(current),edge(reference))
        report["screens"][name]={"thumbnail_mae":round(tm,4),"edge_mae":round(em,4),"pass":tm<=tmax and em<=emax}
        if tm>tmax or em>emax:
            errors.append(f"{name}: visual drift thumbnail_mae={tm:.2f}/{tmax:.2f}, edge_mae={em:.2f}/{emax:.2f}")
    out=ROOT/".artifacts/ui/visual-regression-report.json"; out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2),encoding="utf-8")
    if errors:
        print("FRAMEFORGE visual regression FAILED:")
        for e in errors: print(" -",e)
        return 1
    print(f"PASS: {len(report['screens'])} screenshot fingerprints within visual thresholds")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
