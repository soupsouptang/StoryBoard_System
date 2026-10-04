"""Build the two approved offline UI font families for FrameForge.

Satoshi webfonts are downloaded from Fontshare's official CDN. Sarasa Gothic
SC is subset into Unicode-range WOFF2 files so a Chinese UI does not download
the full 24 MB source font before first paint.
"""
from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "static" / "fonts"
SARASA_SOURCE = Path(os.environ.get(
    "FRAMEFORGE_SARASA_SOURCE",
    r"C:\Users\Hatsune\AppData\Local\Microsoft\Windows\Fonts\SarasaGothicSC-Regular.ttf",
))
FONTTOOLS_ROOT = Path(os.environ.get(
    "FRAMEFORGE_FONTTOOLS",
    r"C:\Users\Hatsune\AppData\Local\Temp\frameforge-fonttools",
))

SATOSHI = {
    "satoshi-regular.woff2": "https://cdn.fontshare.com/wf/TTX2Z3BF3P6Y5BQT3IV2VNOK6FL22KUT/7QYRJOI3JIMYHGY6CH7SOIFRQLZOLNJ6/KFIAZD4RUMEZIYV6FQ3T3GP5PDBDB6JY.woff2",
    "satoshi-medium.woff2": "https://cdn.fontshare.com/wf/P2LQKHE6KA6ZP4AAGN72KDWMHH6ZH3TA/ZC32TK2P7FPS5GFTL46EU6KQJA24ZYDB/7AHDUZ4A7LFLVFUIFSARGIWCRQJHISQP.woff2",
    "satoshi-bold.woff2": "https://cdn.fontshare.com/wf/LAFFD4SDUCDVQEXFPDC7C53EQ4ZELWQI/PXCT3G6LO6ICM5I3NTYENYPWJAECAWDD/GHM6WVH6MILNYOOCXHXB5GTSGNTMGXZR.woff2",
}

SARASA_RANGES = {
    "sarasa-gothic-sc-symbols.woff2": [(0x2000, 0x33FF), (0xFE30, 0xFEFF), (0xFF00, 0xFFEF)],
    "sarasa-gothic-sc-ext-a.woff2": [(0x3400, 0x4DBF)],
    "sarasa-gothic-sc-cjk-1.woff2": [(0x4E00, 0x62FF)],
    "sarasa-gothic-sc-cjk-2.woff2": [(0x6300, 0x77FF)],
    "sarasa-gothic-sc-cjk-3.woff2": [(0x7800, 0x8CFF)],
    "sarasa-gothic-sc-cjk-4.woff2": [(0x8D00, 0x9FFF), (0xF900, 0xFAFF)],
}


def download_satoshi() -> None:
    for filename, url in SATOSHI.items():
        target = OUTPUT / filename
        if target.exists() and target.stat().st_size > 1000:
            continue
        print(f"Downloading {filename}")
        urllib.request.urlretrieve(url, target)


def build_sarasa() -> None:
    if not SARASA_SOURCE.exists():
        raise FileNotFoundError(f"Sarasa Gothic SC source not found: {SARASA_SOURCE}")
    if str(FONTTOOLS_ROOT) not in sys.path:
        sys.path.insert(0, str(FONTTOOLS_ROOT))
    from fontTools import subset

    for filename, ranges in SARASA_RANGES.items():
        target = OUTPUT / filename
        unicodes = set()
        for start, end in ranges:
            unicodes.update(range(start, end + 1))
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.recalc_timestamp = False
        options.notdef_glyph = True
        font = subset.load_font(str(SARASA_SOURCE), options)
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        subset.save_font(font, str(target), options)
        print(f"Built {filename}: {target.stat().st_size / 1024:.0f} KiB")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    download_satoshi()
    build_sarasa()


if __name__ == "__main__":
    main()
