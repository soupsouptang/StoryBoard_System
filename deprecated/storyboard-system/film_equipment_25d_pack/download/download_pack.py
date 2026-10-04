#!/usr/bin/env python3
# Downloads the official CC0 TV Studio and Broadcast Gallery pack from 3DAssets.dev.
# Usage: python download_pack.py [--core]
import json, os, re, sys, time, urllib.request
from pathlib import Path
API = "https://3dassets.dev/api/v1/packs/tv-studio-and-broadcast-gallery"
OUT = Path(__file__).resolve().parent.parent / "downloaded_cc0_models"
OUT.mkdir(parents=True, exist_ok=True)
CORE = any(x == "--core" for x in sys.argv[1:])
KEYWORDS = ["camera","tripod","jib","fresnel","softbox","light","lighting","boom","microphone","sandbag","cable drum","monitor","brace","gaffer","scenery"]

def get_json(url):
    req=urllib.request.Request(url, headers={"User-Agent":"FilmEquipment25D/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def download(url,path):
    req=urllib.request.Request(url, headers={"User-Agent":"FilmEquipment25D/1.0"})
    with urllib.request.urlopen(req,timeout=120) as r, open(path,"wb") as f:
        while True:
            b=r.read(1024*1024)
            if not b: break
            f.write(b)

def safe(s):
    s=re.sub(r'[^A-Za-z0-9._ -]+','_',s).strip().replace(' ','_')
    return s[:120]

pack=get_json(API)["data"]
assets=pack.get("assets",[])
if CORE:
    assets=[a for a in assets if any(k in (a.get("title","").lower()+" "+a.get("summary","").lower()) for k in KEYWORDS)]
print(f"Pack: {pack['title']} | selected {len(assets)} / {pack['assetCount']} models | {pack['licenseLabel']}")
rows=[]
for i,a in enumerate(assets,1):
    url=a["cdnUrl"]
    fn=f"{a['id']}_{safe(a['title'])}.glb"
    dst=OUT/fn
    print(f"[{i}/{len(assets)}] {a['title']}")
    if not dst.exists():
        for attempt in range(3):
            try:
                download(url,dst); break
            except Exception as e:
                if attempt==2: raise
                time.sleep(2*(attempt+1))
    rows.append({"id":a["id"],"title":a["title"],"file":fn,"cdnUrl":url,"license":a["license"]["name"],"triangles":a.get("stats",{}).get("triangles")})
(OUT/"manifest_downloaded.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
print("Done:",OUT)
