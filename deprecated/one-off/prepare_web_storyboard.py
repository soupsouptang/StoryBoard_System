import json
import re
import time
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from openpyxl import load_workbook
from openpyxl.comments import Comment
from openpyxl.drawing.image import Image as XLImage


ROOT = Path(r"C:\Users\Hatsune\Documents\Codex\2026-08-28\referenced-chatgpt-conversation-this-is-an")
SOURCE = ROOT / "天津国际农产品交易中心_4分30秒_画面分镜图版_V3_119镜.xlsx"
OUTPUT = ROOT / "天津国际农产品交易中心_4分30秒_画面分镜图版_V4_网络素材预填.xlsx"
ASSET_DIR = ROOT / "_storyboard_assets" / "web"
ASSET_DIR.mkdir(parents=True, exist_ok=True)


QUERY = {
    "bohai_sunrise": "Bohai Sea sunrise",
    "container_ship": "container ship at sea China",
    "tianjin_port": "Tianjin Port container terminal",
    "cargo_plane": "cargo airplane takeoff",
    "tianjin_skyline": "Tianjin skyline China",
    "produce_truck": "vegetable wholesale market truck unloading",
    "vegetable_unloading": "workers unloading vegetables market",
    "produce_inspection": "customer inspecting vegetables market",
    "fruit_shop": "fresh fruit market shop",
    "fruit_cold_storage": "fruit cold storage warehouse",
    "fresh_fruit": "fresh cherries oranges fruit display",
    "cold_storage": "cold storage logistics warehouse",
    "cold_forklift": "forklift cold storage warehouse",
    "fish_market": "fresh fish market aquarium tanks",
    "flower_greenhouse": "flower greenhouse interior",
    "flowers": "flowers greenhouse close up",
    "automated_warehouse": "automated high bay warehouse forklift",
    "qr_scan": "warehouse worker scanning barcode box",
    "dry_goods": "grain food wholesale market",
    "food_shopping": "customer shopping food supermarket",
    "frozen_food": "frozen food supermarket display",
    "mushrooms": "mushrooms vegetable market display",
    "logistics_control": "logistics control room screens",
    "refrigerated_truck": "refrigerated delivery truck logistics",
    "food_sorting": "vegetable sorting conveyor factory",
    "customs_inspection": "customs cargo inspection truck",
    "cargo_scanner": "cargo inspection scanner customs",
    "finance_office": "business finance office meeting",
    "bank_computer": "business banking computer office",
    "contract_signing": "business contract signing handshake",
    "livestream": "live streaming ecommerce product seller",
    "parcel_sorting": "parcel sorting conveyor logistics",
    "data_control": "data control room large screen",
    "apartment_lobby": "young person luggage apartment lobby",
    "office_team": "modern office team meeting",
    "hotel_lobby": "modern hotel lobby entrance",
    "service_counter": "customer service counter business center",
    "wholesale_market": "large wholesale produce market interior",
    "market_morning": "vegetable market early morning unloading",
    "supermarket_stocking": "worker stocking vegetables supermarket",
    "elderly_shopping": "elderly person shopping vegetables market",
    "child_fruit": "child holding fresh fruit market",
    "cooking": "cooking fresh vegetables kitchen steam",
    "family_dinner": "Chinese family dinner table",
    "port_truck": "container truck leaving port",
    "freight_train": "China freight train containers",
    "merchant_loading": "merchant loading produce delivery van",
    "market_customer": "customer buying vegetables market smile",
    "cafeteria": "people eating hot meal cafeteria",
    "delegation": "government delegation site inspection China",
    "international_meeting": "international business meeting table",
    "video_conference": "business video conference large screen",
    "business_group": "business partners group meeting",
}


SUB_TO_CATEGORY = {
    "1.1": "bohai_sunrise", "1.2": "container_ship", "1.3": "tianjin_port",
    "1.4": "cargo_plane", "1.5": "tianjin_skyline",
    "9.1": "produce_truck", "9.2": "vegetable_unloading", "9.3": "produce_inspection",
    "10.1": "fruit_shop", "10.2": "fruit_cold_storage", "10.3": "fresh_fruit",
    "11.1": "cold_storage", "11.2": "cold_forklift", "11.3": "fish_market",
    "12.1": "flower_greenhouse", "12.2": "flowers",
    "13.1": "cold_storage", "13.2": "automated_warehouse", "13.3": "qr_scan",
    "14.1": "dry_goods", "14.2": "food_shopping", "14.3": "frozen_food",
    "14.4": "mushrooms", "14.5": "logistics_control", "14.6": "refrigerated_truck",
    "14.7": "food_sorting",
    "15.1": "customs_inspection", "15.2": "cargo_scanner", "15.3": "customs_inspection",
    "16.1": "finance_office", "16.2": "bank_computer", "16.3": "contract_signing",
    "17.1": "livestream", "17.2": "livestream", "17.3": "parcel_sorting",
    "18.1": "data_control", "18.2": "apartment_lobby", "18.3": "office_team",
    "18.4": "hotel_lobby", "18.5": "service_counter",
    "19.3": "wholesale_market", "19.4": "refrigerated_truck",
    "20.1": "market_morning", "20.2": "supermarket_stocking", "20.3": "elderly_shopping",
    "20.4": "child_fruit", "20.5": "cooking", "20.6": "family_dinner",
    "21.1": "tianjin_port", "21.2": "port_truck", "21.4": "food_sorting",
    "21.5": "refrigerated_truck", "22.4": "freight_train",
    "23.1": "merchant_loading", "23.2": "market_customer", "23.3": "apartment_lobby",
    "23.4": "cafeteria",
    "25.1": "delegation", "25.2": "contract_signing", "25.3": "international_meeting",
    "25.4": "video_conference", "25.5": "business_group",
}


def api_json(params):
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": "CodexStoryboard/1.0 (internal production reference)"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def search_commons(query):
    data = api_json({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6, "gsrlimit": 12,
        "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 900,
    })
    candidates = []
    for page in (data.get("query", {}).get("pages", {}) or {}).values():
        info_list = page.get("imageinfo") or []
        if not info_list:
            continue
        info = info_list[0]
        width, height = int(info.get("width", 0)), int(info.get("height", 0))
        thumb = info.get("thumburl") or info.get("url")
        if not thumb or width < 700 or height < 400:
            continue
        meta = info.get("extmetadata", {}) or {}
        license_name = (meta.get("LicenseShortName", {}) or {}).get("value", "未标注")
        artist = re.sub("<[^>]+>", "", (meta.get("Artist", {}) or {}).get("value", "未标注"))
        description = re.sub("<[^>]+>", "", (meta.get("ImageDescription", {}) or {}).get("value", ""))
        score = (1 if width >= height else 0) + min(width / max(height, 1), 2) + (1 if "CC" in license_name or "Public" in license_name else 0)
        candidates.append({
            "score": score, "title": page.get("title", ""), "url": thumb,
            "page": info.get("descriptionurl", ""), "license": license_name,
            "artist": artist, "description": description, "width": width, "height": height,
        })
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates[0] if candidates else None


def download_image(category, metadata):
    output = ASSET_DIR / f"{category}.jpg"
    if output.exists():
        return output
    request = urllib.request.Request(metadata["url"], headers={"User-Agent": "CodexStoryboard/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
    image = Image.open(BytesIO(raw)).convert("RGB")
    image = ImageOps.exif_transpose(image)
    image = ImageOps.fit(image, (900, 506), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    image = ImageEnhance.Contrast(image).enhance(1.07)
    image = ImageEnhance.Color(image).enhance(0.92)
    image.save(output, quality=88, optimize=True)
    return output


def make_shot_variant(base_path, shot_number, sub_number):
    output = ASSET_DIR / f"shot_{shot_number}_{sub_number.replace('.', '_')}.jpg"
    image = Image.open(base_path).convert("RGB")
    # 同一素材用于连续子镜时做轻微裁切差异，保持镜头连续性。
    seed = sum(ord(c) for c in sub_number)
    shift = ((seed % 9) - 4) / 100
    image = ImageOps.fit(image, (720, 405), method=Image.Resampling.LANCZOS, centering=(0.5 + shift, 0.5))
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    # 不叠加正文，避免影响原图；只做电影感上下遮幅。
    from PIL import ImageDraw
    draw = ImageDraw.Draw(overlay)
    draw.rectangle((0, 0, 720, 12), fill=(8, 10, 14, 220))
    draw.rectangle((0, 393, 720, 405), fill=(8, 10, 14, 220))
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    image.save(output, quality=86, optimize=True)
    return output


def main():
    metadata_by_category = {}
    failures = []
    for category in sorted(set(SUB_TO_CATEGORY.values())):
        try:
            metadata = search_commons(QUERY[category])
            if not metadata:
                failures.append(category)
                continue
            path = download_image(category, metadata)
            metadata["local"] = str(path)
            metadata_by_category[category] = metadata
            print(f"FOUND|{category}|{metadata['title']}|{metadata['license']}")
            time.sleep(0.15)
        except Exception as exc:
            failures.append(category)
            print(f"FAILED|{category}|{type(exc).__name__}:{exc}")

    book = load_workbook(SOURCE)
    sheet = book.active
    headers = {sheet.cell(3, c).value: c for c in range(1, sheet.max_column + 1)}
    inserted = 0
    pending = 0
    for row in range(4, sheet.max_row + 1):
        shot = str(sheet.cell(row, headers["镜号"]).value)
        sub = str(sheet.cell(row, headers["子镜号/镜头编号"]).value)
        frame_cell = sheet.cell(row, headers["分镜图框"])
        category = SUB_TO_CATEGORY.get(sub)
        if category and category in metadata_by_category:
            metadata = metadata_by_category[category]
            variant = make_shot_variant(Path(metadata["local"]), shot, sub)
            picture = XLImage(str(variant))
            picture.width = 215
            picture.height = 121
            picture.anchor = frame_cell.coordinate
            sheet.add_image(picture)
            frame_cell.value = None
            frame_cell.comment = Comment(
                "网络参考素材（Wikimedia Commons）\n"
                f"文件：{metadata['title']}\n"
                f"作者：{metadata['artist']}\n"
                f"许可：{metadata['license']}\n"
                f"来源：{metadata['page']}\n"
                "用途：内部导演分镜与构图参考；正式商业使用前需再次核验授权。",
                "Codex",
            )
            frame_cell.hyperlink = metadata["page"]
            inserted += 1
        else:
            execution = str(sheet.cell(row, headers["执行方式"]).value or "")
            if "LOGO" in str(sheet.cell(row, headers["画面描述"]).value or "") or "文件" in execution:
                frame_cell.value = "待甲方提供\n品牌 / 文件素材"
                frame_cell.comment = Comment("此镜涉及官方LOGO、项目资质或审定文件，不宜从网络替代或AI生成。", "Codex")
            else:
                frame_cell.value = "待生成\n三维 / MG / 项目概念图"
                frame_cell.comment = Comment("未找到能与项目及规划准确对应的网络图片，应使用项目模型、甲方规划图或AI概念图生成。", "Codex")
            pending += 1

    book.properties.title = "天津国际农产品交易中心 4分30秒 画面分镜图版 V4 网络素材预填"
    book.properties.description = f"119镜；已嵌入网络参考素材{inserted}镜；待生成或甲方素材{pending}镜。"
    book.save(OUTPUT)
    print(f"RESULT|output={OUTPUT}|inserted={inserted}|pending={pending}|categories={len(metadata_by_category)}|failures={len(failures)}")


if __name__ == "__main__":
    main()
