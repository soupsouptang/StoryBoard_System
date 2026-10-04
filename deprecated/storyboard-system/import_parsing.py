"""Storyboard import parsing and source-column mapping.

This module has no server or database dependency. Image records retain their
worksheet row and archive member so the import API can stage the original bytes.
"""
from __future__ import annotations

import base64
import difflib
import hashlib
import io
import mimetypes
import posixpath
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


# Column Header Recognition Dictionary (Spec Section 115)
ALIASES = {
    "number": ["镜号", "镜头编号", "编号", "shot", "shot no", "shot number", "序号", "no", "id"],
    "title": ["镜头标题", "标题", "内容", "镜头内容", "shot title", "title", "name"],
    "chapter": ["篇章", "章节", "幕", "chapter", "act", "sequence", "seq"],
    "scene": ["场景", "地点", "场景/地点", "scene", "location", "int/ext", "内外景"],
    "panel_frame": ["分镜图框", "分镜框", "分镜图", "storyboard frame", "frame"],
    "description": ["画面描述", "画面内容", "画面", "分镜画面", "description", "visual", "action"],
    "voiceover": ["对应旁白", "旁白", "解说词", "配音", "voiceover", "vo", "narration", "dialogue"],
    "duration": ["时长", "时长(秒)", "时长（秒）", "duration", "seconds", "sec", "length"],
    "duration_frames": ["帧数", "frames", "frame count", "duration frames"],
    "shot_size": ["景别", "shot size", "framing", "size"],
    "lens": ["焦段", "建议焦段", "镜头焦段", "镜头", "lens", "focal"],
    "movement": ["机位/运镜", "运镜", "镜头运动", "movement", "camera movement", "camera"],
    "angle": ["机位角度", "角度", "angle", "camera angle"],
    "primary_method": ["制作方式", "执行方式", "拍摄方式", "制作类型", "method", "production method", "execution"],
    "department": ["责任部门", "责任组", "部门", "department", "dept"],
    "owner": ["负责人", "执行人", "owner", "assignee", "artist"],
    "sound": ["声音", "音效", "sound", "sfx", "audio"],
    "transition": ["剪辑/转场", "转场", "transition", "edit"],
    "vfx": ["vfx", "特效", "视效", "cg", "vfx requirement"],
    "notes": ["备注", "制作备注", "导演备注", "notes", "director notes", "comment"],
    "source_type": ["素材来源", "素材路径", "source", "source type", "stock source", "asset path"],
    "source_note": ["素材说明", "来源说明", "source note", "rights note"]
}


def _clean_import_filename(value: str) -> str:
    value = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", value).strip(" .")
    return value[:160] or "file"


# ===============================================
# Excel / CSV Importer (Spec Section 114-117)
# ===============================================

def norm_header(val: str) -> str:
    return re.sub(r"[\s_\-/（）()：:·|]+", "", str(val or "")).lower()


def map_headers(headers: list[str]) -> dict[str, dict]:
    """Score headers with confidence dictionary."""
    result: dict[str, dict] = {}
    normalized = [norm_header(h) for h in headers]
    used_cols: set[int] = set()

    for field, aliases in ALIASES.items():
        candidates = [norm_header(field)] + [norm_header(a) for a in aliases]
        best_col = -1
        best_score = 0.0
        for idx, header in enumerate(normalized):
            if not header or idx in used_cols:
                continue
            if header in candidates:
                best_col = idx
                best_score = 0.99
                break
            for c in candidates:
                if c and (c in header or header in c):
                    score = len(c) / max(len(header), 1) * 0.9
                    if score > best_score:
                        best_score = score
                        best_col = idx
                elif c:
                    score = difflib.SequenceMatcher(None, header, c).ratio() * 0.86
                    if score > best_score:
                        best_score = score
                        best_col = idx
        if best_col >= 0 and best_score >= 0.6:
            result[field] = {"col": best_col, "header": headers[best_col], "confidence": round(best_score, 2)}
            used_cols.add(best_col)

    return result


PDF_IMPORT_HEADERS = ["镜号", "镜头标题", "景别", "焦段", "机位/运镜", "机位角度", "画面描述", "对应旁白", "时长", "备注"]


def parse_pdf_storyboard(source: Path, *, with_metadata: bool = False, preserve_source: bool = False) -> tuple[list[list[str]], list[dict]] | tuple[list[list[str]], list[dict], dict]:
    """Recognize card-style storyboard PDFs as one shot per card/page."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ValueError("服务器缺少 PDF 识别组件 pypdf，请安装后重试") from exc
    try:
        reader = PdfReader(str(source))
    except Exception as exc:
        raise ValueError("PDF 文件损坏、加密或无法读取") from exc
    if reader.is_encrypted:
        try:
            if not reader.decrypt(""):
                raise ValueError("暂不支持有密码的 PDF")
        except Exception as exc:
            raise ValueError("暂不支持有密码的 PDF") from exc

    rows: list[list[str]] = [PDF_IMPORT_HEADERS]
    images: list[dict] = []
    source_blocks: list[str] = []
    text_page_count = 0
    rendered_page_count = 0
    shot_sizes = ("大全景", "中全景", "中近景", "大特写", "全景", "中景", "近景", "特写")
    marker = re.compile(r"(?im)(?=^\s*(?:#\s*\d{1,6}|SHOT\s*[-_ ]?\d{1,6}|镜头\s*[-_ ]?\d{1,6}))")
    for page_index, page in enumerate(reader.pages):
        try:
            raw_text = page.extract_text(extraction_mode="layout") or page.extract_text() or ""
        except Exception:
            raw_text = page.extract_text() or ""
        raw_text = raw_text.replace("\u00a0", " ").replace("\x00", "")
        text_page_count += bool(raw_text.strip())
        blocks = [part.strip() for part in marker.split(raw_text) if part.strip()]
        # Page headings before the first card marker are not separate shots.
        marked = [block for block in blocks if marker.match(block)]
        if marked:
            blocks = marked
        if not blocks and raw_text.strip():
            blocks = [raw_text.strip()]
        page_row_start = len(rows) - 1
        for block in blocks:
            lines = [re.sub(r"\s+", " ", line).strip() for line in block.splitlines() if line.strip()]
            joined = "\n".join(lines)
            number_match = re.search(r"(?i)(?:#|SHOT\s*[-_ ]?|镜头\s*[-_ ]?)(\d{1,6})", joined)
            number = number_match.group(1).zfill(3) if number_match else str(len(rows)).zfill(3)
            size = next((item for item in shot_sizes if item in joined), "")
            lens_match = re.search(r"(?i)(?:建议|焦段|镜头)?\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)\s*mm", joined)
            duration_match = re.search(r"(?i)(?:时长(?:[（(]秒[)）])?|duration)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(?:s|秒)?", joined)
            labelled: dict[str, str] = {}
            free_lines: list[str] = []
            for line in lines:
                match = re.match(r"^([^:：]{1,12})\s*[:：]\s*(.+)$", line)
                if match:
                    labelled[norm_header(match.group(1))] = match.group(2).strip()
                elif not re.search(r"(?i)(?:#\s*\d+|SHOT\s*[-_ ]?\d+|p\.\s*\d+|img\.\s*\d+)", line) and line not in shot_sizes:
                    free_lines.append(line)
            title = labelled.get("标题") or labelled.get("镜头标题") or (free_lines[0] if free_lines else f"镜头 {number}")
            description = labelled.get("画面描述") or labelled.get("画面") or "\n".join(free_lines[1:] if free_lines and free_lines[0] == title else free_lines)
            notes = [f"{key}：{value}" for key, value in labelled.items() if key not in {"标题", "镜头标题", "画面描述", "画面", "运镜", "机位", "机位角度", "旁白", "对应旁白", "时长", "焦段"}]
            source_blocks.append(joined)
            rows.append([
                number, title, size, f"{lens_match.group(1)}mm" if lens_match else "",
                labelled.get("运镜", ""), labelled.get("机位", labelled.get("机位角度", "")),
                description, labelled.get("旁白", labelled.get("对应旁白", "")),
                duration_match.group(1) if duration_match else "", "\n".join(notes)
            ])
        if not blocks:
            # Scanned/image-only storyboard pages still represent real shots.
            # Keep the page as an importable row and let the preview show the
            # page image instead of failing the whole PDF.
            source_blocks.append(raw_text)
            rows.append([str(len(rows)).zfill(3), f"PDF 第 {page_index + 1} 页", "", "", "", "", "", "", "", ""])
        candidates = []
        try:
            for image in page.images:
                raw = bytes(image.data)
                if raw:
                    candidates.append((len(raw), image.name or f"page-{page_index + 1}.jpg", raw))
        except Exception:
            candidates = []
        # When a page has no extractable text, its visible lettering may be
        # vector outlines rather than an embedded image. Prefer a full-page
        # render so the image-only import preserves what the user can see.
        render_entire_page = not raw_text.strip()
        if (render_entire_page or not candidates) and len(rows) - 1 > page_row_start and shutil.which("pdftoppm"):
            try:
                with tempfile.TemporaryDirectory(prefix="frameforge-pdf-") as tmp:
                    prefix = str(Path(tmp) / "page")
                    subprocess.run(["pdftoppm", "-f", str(page_index + 1), "-l", str(page_index + 1), "-jpeg", "-singlefile", "-r", "144", str(source), prefix], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
                    rendered = Path(prefix + ".jpg")
                    if rendered.exists():
                        raw = rendered.read_bytes()
                        page_image = (len(raw), f"page-{page_index + 1}.jpg", raw)
                        candidates = [page_image] if render_entire_page else [*candidates, page_image]
                        rendered_page_count += int(render_entire_page)
            except (OSError, subprocess.SubprocessError):
                pass
        if candidates and len(rows) - 1 > page_row_start:
            page_rows = rows[page_row_start + 1:]
            for _, image_name, raw in candidates:
                mime = mimetypes.guess_type(image_name)[0] or "image/jpeg"
                if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
                    continue
                if len(page_rows) == 1:
                    row_index = page_row_start + 1
                else:
                    image_marker = re.search(r"(?i)(?:shot|镜头|#)[-_ ]*(\d+)", image_name)
                    matches = [index for index, row in enumerate(page_rows) if image_marker and row[0].lstrip('0') == image_marker.group(1).lstrip('0')]
                    if len(matches) != 1:
                        raise ValueError(f"PDF 第 {page_index + 1} 页含多镜头，图片无法可靠定位；请使用单镜头分页 PDF 或带 SHOT 编号的图片")
                    row_index = page_row_start + 1 + matches[0]
                images.append({"data_row": row_index, "filename": _clean_import_filename(Path(image_name).name), "mime": mime, "size": len(raw), "raw": raw})
    if preserve_source:
        # Keep the shared PDF recognizer, while exposing original labelled
        # values and source text to the canonical mapping/preview pipeline.
        extra_headers: list[str] = []
        labels_per_row = []
        for block in source_blocks:
            labels = {}
            for line in block.splitlines():
                match = re.match(r'^([^:：]{1,40})\s*[:：]\s*(.*)$', line)
                if match:
                    label = match[1].strip()
                    if label not in PDF_IMPORT_HEADERS:
                        labels[label] = match[2].strip()
                        if label not in extra_headers: extra_headers.append(label)
            labels_per_row.append(labels)
        rows[0] = [*PDF_IMPORT_HEADERS, *extra_headers, 'PDF 原文']
        rows[1:] = [row + [labels.get(h, '') for h in extra_headers] + [block] for row, labels, block in zip(rows[1:],labels_per_row,source_blocks)]
    if len(rows) == 1:
        raise ValueError("PDF 未识别到可导入内容；请确认文件未损坏或已包含可读取页面")
    if with_metadata:
        return rows, images, {"page_count": len(reader.pages), "text_page_count": text_page_count,
                              "rendered_page_count": rendered_page_count}
    return rows, images


def build_import_custom_columns(headers: list[str], mapping: dict[str, dict]) -> list[dict]:
    """Describe source columns that are not consumed by the core mapping.

    The key is deterministic for a given source column, so importing the same
    workbook more than once reuses the project's custom field instead of
    creating a new duplicate field on every import.
    """
    mapped_cols = set()
    for info in (mapping or {}).values():
        if isinstance(info, dict):
            try:
                col = int(info.get("col", -1))
            except (TypeError, ValueError):
                col = -1
            if col >= 0:
                mapped_cols.add(col)
    seen: dict[str, int] = {}
    result: list[dict] = []
    for index, raw in enumerate(headers):
        if index in mapped_cols:
            continue
        label = str(raw or "").strip() or f"未命名列{index + 1}"
        seen[label] = seen.get(label, 0) + 1
        display_label = label if seen[label] == 1 else f"{label} ({seen[label]})"
        digest = hashlib.sha1(f"{index}:{label}".encode("utf-8")).hexdigest()[:10]
        result.append({
            "source_col": index,
            "label": display_label[:80],
            "key": f"excel_col_{index + 1}_{digest}",
            "field_type": "text",
        })
    return result


def parse_xlsx_package(source: bytes | Path, include_image_data: bool = False) -> tuple[list[list[str]], list[dict]]:
    """Read the first worksheet and images associated with worksheet rows.

    Excel storyboard files commonly keep the picture outside the cell grid as
    a drawing.  The row anchor is the only stable association available in a
    normal XLSX, so we preserve that association for the import wizard.  Newer
    Excel builds can instead store an image as a ``_localImage`` rich value in
    the cell itself; those are resolved from the workbook rich-data relations.
    """
    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    archive_source = source if isinstance(source, Path) else io.BytesIO(source)
    with zipfile.ZipFile(archive_source) as zf:
        names = set(zf.namelist())
        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{ns}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{ns}t")))
        sheets = sorted(n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml"))
        if not sheets:
            return [], []
        sheet_name = sheets[0]
        root = ET.fromstring(zf.read(sheet_name))
        output: list[list[str]] = []
        sheet_row_indices: dict[int, int] = {}
        for row in root.iter(f"{ns}row"):
            cells: dict[int, str] = {}
            for cell in row.findall(f"{ns}c"):
                ref = cell.get("r", "A1")
                letters = re.match(r"[A-Z]+", ref)
                col = 0
                for ch in (letters.group(0) if letters else "A"):
                    col = col * 26 + ord(ch) - 64
                col -= 1
                cell_type = cell.get("t")
                if cell_type == "inlineStr":
                    value = "".join(t.text or "" for t in cell.iter(f"{ns}t"))
                else:
                    node = cell.find(f"{ns}v")
                    value = node.text if node is not None and node.text is not None else ""
                    if cell_type == "s" and value.isdigit() and int(value) < len(shared):
                        value = shared[int(value)]
                cells[col] = value
            if cells:
                sheet_row_indices[int(row.get("r", len(output) + 1)) - 1] = len(output)
                output.append([cells.get(i, "") for i in range(max(cells) + 1)])
        embedded_images: list[dict] = []

        def add_image(data_row: int, media_name: str) -> None:
            """Record a workbook image once, preserving its target sheet row."""
            data_row = sheet_row_indices.get(data_row, -1)
            if data_row < 0:
                return
            if media_name not in names:
                return
            suffix = posixpath.splitext(media_name)[1].lower()
            mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}.get(suffix)
            if not mime or any(item["data_row"] == data_row and item["archive_name"] == media_name for item in embedded_images):
                return
            media_info = zf.getinfo(media_name)
            item = {
                "data_row": data_row,
                "filename": f"excel-image-{len(embedded_images) + 1:03d}{suffix}",
                "mime": mime,
                "size": media_info.file_size,
                "archive_name": media_name,
            }
            if include_image_data:
                item["data"] = base64.b64encode(zf.read(media_name)).decode("ascii")
            embedded_images.append(item)

        rel_ns = "{http://schemas.openxmlformats.org/package/2006/relationships}"
        drawing_ns = "{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}"
        office_rel_ns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
        sheet_rel = posixpath.join(posixpath.dirname(sheet_name), "_rels", posixpath.basename(sheet_name) + ".rels")
        if sheet_rel in names:
            sheet_rels = ET.fromstring(zf.read(sheet_rel))
            rel_targets = {item.get("Id"): item.get("Target", "") for item in sheet_rels.findall(f"{rel_ns}Relationship")}
            drawing_ref = next(iter(root.iter(f"{ns}drawing")), None)
            drawing_target = rel_targets.get(drawing_ref.get(f"{office_rel_ns}id")) if drawing_ref is not None else None
            if drawing_target:
                drawing_name = posixpath.normpath(posixpath.join(posixpath.dirname(sheet_name), drawing_target)).lstrip("/")
                drawing_rel = posixpath.join(posixpath.dirname(drawing_name), "_rels", posixpath.basename(drawing_name) + ".rels")
                if drawing_name in names and drawing_rel in names:
                    drawing_root = ET.fromstring(zf.read(drawing_name))
                    drawing_rels = ET.fromstring(zf.read(drawing_rel))
                    media_targets = {item.get("Id"): item.get("Target", "") for item in drawing_rels.findall(f"{rel_ns}Relationship")}
                    for anchor in list(drawing_root):
                        from_node = anchor.find(f"{drawing_ns}from")
                        if from_node is None:
                            continue
                        row_node = from_node.find(f"{drawing_ns}row")
                        pic = anchor.find(f"{drawing_ns}pic")
                        blip_fill = pic.find(f"{drawing_ns}blipFill") if pic is not None else None
                        blip = blip_fill.find("{http://schemas.openxmlformats.org/drawingml/2006/main}blip") if blip_fill is not None else None
                        if row_node is None or blip is None or not row_node.text:
                            continue
                        media_target = media_targets.get(blip.get(f"{office_rel_ns}embed"))
                        if not media_target:
                            continue
                        media_name = posixpath.normpath(posixpath.join(posixpath.dirname(drawing_name), media_target)).lstrip("/")
                        if media_name not in names:
                            continue
                        add_image(int(row_node.text), media_name)

        # Excel 365's in-cell image feature does not create a drawing part.
        # A cell's `vm` points into metadata.xml/valueMetadata, which in turn
        # points at richData/rdrichvalue.xml; its first value indexes the
        # corresponding relation in richData/richValueRel.xml.
        rich_values_name = "xl/richData/rdrichvalue.xml"
        rich_rel_name = "xl/richData/richValueRel.xml"
        rich_rel_targets_name = "xl/richData/_rels/richValueRel.xml.rels"
        metadata_name = "xl/metadata.xml"
        if {rich_values_name, rich_rel_name, rich_rel_targets_name, metadata_name}.issubset(names):
            try:
                rich_root = ET.fromstring(zf.read(rich_values_name))
                rich_rel_root = ET.fromstring(zf.read(rich_rel_name))
                rich_target_root = ET.fromstring(zf.read(rich_rel_targets_name))
                metadata_root = ET.fromstring(zf.read(metadata_name))
                rich_ns = "{http://schemas.microsoft.com/office/spreadsheetml/2017/richdata}"
                rich_rel_ns = "{http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel}"
                relationship_ids = [node.get(f"{office_rel_ns}id") for node in rich_rel_root.findall(f"{rich_rel_ns}rel")]
                media_targets = {node.get("Id"): node.get("Target", "") for node in rich_target_root.findall(f"{rel_ns}Relationship")}
                rich_value_rel_index = []
                for rich_value in rich_root.findall(f"{rich_ns}rv"):
                    values = rich_value.findall(f"{rich_ns}v")
                    rich_value_rel_index.append(int(values[0].text) if values and (values[0].text or "").isdigit() else -1)
                value_metadata = metadata_root.find(f"{ns}valueMetadata")
                metadata_rich_values = []
                for book in list(value_metadata) if value_metadata is not None else []:
                    record = book.find(f"{ns}rc")
                    metadata_rich_values.append(int(record.get("v", "-1")) if record is not None and record.get("t") == "1" else -1)
                for cell in root.iter(f"{ns}c"):
                    vm = cell.get("vm")
                    ref = cell.get("r", "")
                    if not vm or not vm.isdigit() or not ref:
                        continue
                    metadata_index = int(vm) - 1
                    rich_value_index = metadata_rich_values[metadata_index] if 0 <= metadata_index < len(metadata_rich_values) else -1
                    relation_index = rich_value_rel_index[rich_value_index] if 0 <= rich_value_index < len(rich_value_rel_index) else -1
                    relation_id = relationship_ids[relation_index] if 0 <= relation_index < len(relationship_ids) else None
                    target = media_targets.get(relation_id, "")
                    row_match = re.search(r"(\d+)$", ref)
                    if not target or row_match is None:
                        continue
                    media_name = posixpath.normpath(posixpath.join("xl/richData", target)).lstrip("/")
                    add_image(int(row_match.group(1)) - 1, media_name)
            except (ET.ParseError, OSError, ValueError, IndexError):
                # A malformed optional rich-data part must not prevent the
                # worksheet itself or conventional floating images importing.
                pass
        return output, embedded_images


def parse_xlsx_rows(payload: bytes) -> list[list[str]]:
    return parse_xlsx_package(payload)[0]


