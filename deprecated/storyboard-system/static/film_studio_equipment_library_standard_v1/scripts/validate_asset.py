import json, sys
from pathlib import Path

REQUIRED_TOP = [
    "id","name","category","asset_level","source","geometry",
    "coordinates","anchors","articulation","compatibility","verification"
]

def fail(msg):
    print("FAIL:", msg)
    return False

def validate(path):
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    ok=True
    for k in REQUIRED_TOP:
        if k not in data:
            ok=fail(f"missing top-level key: {k}") and ok

    c=data.get("coordinates",{})
    if c.get("unit")!="meter":
        ok=fail("coordinates.unit must be meter") and ok
    if c.get("up_axis")!="+Y":
        ok=fail("coordinates.up_axis must be +Y") and ok
    if c.get("forward_axis")!="+Z":
        ok=fail("coordinates.forward_axis must be +Z") and ok

    g=data.get("geometry",{})
    lods=g.get("lods",{})
    for key in ("lod0","lod1","lod2"):
        if key not in lods:
            ok=fail(f"missing {key}") and ok

    ver=data.get("verification",{})
    for key in ("dimensions","pivot","anchors","articulation","web_load","thumbnail","license"):
        if key not in ver:
            ok=fail(f"missing verification.{key}") and ok

    if ok:
        print("PASS:", path)
    return ok

if __name__=="__main__":
    if len(sys.argv)<2:
        raise SystemExit("python validate_asset.py asset.json")
    raise SystemExit(0 if validate(sys.argv[1]) else 1)
