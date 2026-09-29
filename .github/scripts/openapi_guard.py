#!/usr/bin/env python3
"""Compare normalized FastAPI OpenAPI contracts between base and HEAD."""

from __future__ import annotations
import argparse, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
METHODS = {"get","post","put","patch","delete","options","head"}

def export_schema(api_root: Path) -> dict:
    code = "import json; from main import app; print(json.dumps(app.openapi(), ensure_ascii=False, sort_keys=True))"
    env = os.environ.copy()
    env["PYTHONPATH"] = str(api_root)
    env.setdefault("ENVIRONMENT", "test")
    result = subprocess.run([sys.executable,"-c",code],cwd=api_root,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(f"OpenAPI export failed for {api_root}:\n{result.stderr}")
    return json.loads(result.stdout)

def normalize(schema: dict) -> dict:
    out={}
    for path,item in sorted((schema.get("paths") or {}).items()):
        methods={}
        for method,op in sorted(item.items()):
            if method.lower() not in METHODS or not isinstance(op,dict): continue
            params=[]
            for p in op.get("parameters") or []:
                if "$ref" in p: params.append({"ref":p["$ref"]})
                else: params.append({"name":p.get("name"),"in":p.get("in"),"required":bool(p.get("required"))})
            methods[method.lower()]={
                "security":op.get("security"),
                "parameters":params,
                "responses":sorted((op.get("responses") or {}).keys()),
                "request_required":bool((op.get("requestBody") or {}).get("required")),
            }
        if methods: out[path]=methods
    return out

def main() -> int:
    ap=argparse.ArgumentParser()
    ap.add_argument("--base-worktree",type=Path,required=True)
    ap.add_argument("--artifact-dir",type=Path,default=ROOT/".artifacts"/"openapi")
    args=ap.parse_args()
    base_schema=export_schema(args.base_worktree/"apps"/"api")
    head_schema=export_schema(ROOT/"apps"/"api")
    base,head=normalize(base_schema),normalize(head_schema)
    args.artifact_dir.mkdir(parents=True,exist_ok=True)
    for name,data in (("base-openapi",base_schema),("head-openapi",head_schema),("base-contract",base),("head-contract",head)):
        (args.artifact_dir/f"{name}.json").write_text(json.dumps(data,ensure_ascii=False,indent=2,sort_keys=True),encoding="utf-8")
    errors=[]
    for path,bmethods in base.items():
        if path not in head:
            errors.append(f"route path removed: {path}"); continue
        for method,bop in bmethods.items():
            if method not in head[path]:
                errors.append(f"route method removed: {method.upper()} {path}"); continue
            hop=head[path][method]
            removed=sorted(set(bop["responses"])-set(hop["responses"]))
            if removed: errors.append(f"{method.upper()} {path}: response codes removed: {removed}")
            if bop.get("security") and not hop.get("security"):
                errors.append(f"{method.upper()} {path}: OpenAPI security requirement disappeared")
            required={(p.get("in"),p.get("name")) for p in bop["parameters"] if p.get("required") and p.get("name")}
            current={(p.get("in"),p.get("name")) for p in hop["parameters"] if p.get("name")}
            missing=sorted(required-current)
            if missing: errors.append(f"{method.upper()} {path}: required parameters disappeared: {missing}")
    if errors:
        print("FRAMEFORGE OpenAPI guard FAILED:",file=sys.stderr)
        for e in errors: print(f" - {e}",file=sys.stderr)
        return 1
    print(f"PASS: no OpenAPI contraction across {len(base)} base paths")
    return 0

if __name__=="__main__": raise SystemExit(main())
