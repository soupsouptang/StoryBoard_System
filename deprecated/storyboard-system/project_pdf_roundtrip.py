"""Lossless FrameForge project backup carried inside a readable PDF.

The embedded JSON is the complete version-2 backup.  The invisible page mark
and PDF metadata are provenance hints, never a substitute for that attachment.
This module has no database or HTTP dependencies so both paths can use it.
"""

from __future__ import annotations

import hashlib
import html
import io
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

_VENDOR = Path(__file__).resolve().parent / "vendor"
if _VENDOR.is_dir() and str(_VENDOR) not in sys.path:
    sys.path.insert(0, str(_VENDOR))

from pypdf import PdfReader, PdfWriter  # noqa: E402
from pypdf.generic import (  # noqa: E402
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
)


ATTACHMENT_NAME = "frameforge-project-v1.json"
FORMAT_VERSION = "FrameForgeProjectPDF/1"
DEFAULT_MAX_PDF_BYTES = 500 * 1024 * 1024
DEFAULT_MAX_BACKUP_BYTES = 400 * 1024 * 1024


class ProjectPdfError(ValueError):
    """The PDF cannot be used as a complete FrameForge project backup."""


def _plain(value: object) -> str:
    """Keep user text readable in the compact PDF without accepting markup."""
    text = re.sub(r"<[^>]*>", " ", str(value or ""))
    return html.unescape(text).replace("\r", "").replace("\u0000", "")


def _qr_name_preview(value: object, max_bytes: int = 72) -> str:
    """Keep a bounded, valid UTF-8 project-name preview in the small QR."""
    name = _plain(value).strip()
    if len(name.encode("utf-8")) <= max_bytes:
        return name
    suffix = "…"
    budget = max(0, max_bytes - len(suffix.encode("utf-8")))
    preview = ""
    for character in name:
        if len((preview + character).encode("utf-8")) > budget:
            break
        preview += character
    return preview + suffix


def render_project_summary_pdf(bundle: dict, backup_bytes: bytes) -> bytes:
    """Render all shots as searchable, multipage PDF with a compact QR manifest.

    reportlab is required only for export. Import can still extract a complete
    project from an existing PDF when reportlab is unavailable.
    """
    _validate_backup(backup_bytes, DEFAULT_MAX_BACKUP_BYTES)
    try:
        from reportlab.graphics.barcode import qr
        from reportlab.graphics.shapes import Drawing
        from reportlab.graphics import renderPDF
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.cidfonts import UnicodeCIDFont
        from reportlab.pdfgen import canvas
    except ImportError as exc:
        raise ProjectPdfError("缺少 PDF 生成组件 reportlab，请安装 requirements.txt") from exc

    if not isinstance(bundle, dict) or not isinstance(bundle.get("project"), dict) or not isinstance(bundle.get("shots"), list):
        raise ProjectPdfError("工程摘要数据无效")
    project, shots = bundle["project"], bundle["shots"]
    digest = hashlib.sha256(backup_bytes).hexdigest()
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    assets = bundle.get("_backup", {}).get("tables", {}).get("assets", [])
    manifest = json.dumps({
        "k": "FFPDF1",
        "v": 1,
        "n": _qr_name_preview(project.get("name")),
        "t": generated_at,
        "s": len(shots),
        "a": len(assets),
        "f": project.get("fps"),
        "r": project.get("aspect_ratio"),
        "h": digest,
    }, ensure_ascii=False, separators=(",", ":"))

    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    font = "STSong-Light"
    width, height = A4
    margin = 42
    right = width - margin
    output = io.BytesIO()
    doc = canvas.Canvas(output, pagesize=A4, pageCompression=1)
    doc.setTitle(f"{_plain(project.get('name'))} - FrameForge 工程 PDF")
    doc.setAuthor("FrameForge")
    page_number = 0
    y = 0.0

    def page_header(first: bool) -> None:
        nonlocal page_number, y
        if page_number:
            doc.showPage()
        page_number += 1
        doc.setFillColorRGB(0.10, 0.12, 0.14)
        title_size = 17 if first else 11
        doc.setFont(font, title_size)
        title = _plain(project.get("name") or "未命名工程")
        # Reserve the QR's entire right edge on page one. Long project names
        # otherwise paint over the small symbol and make it unreadable.
        title_width = (right - 72 - 12 if first else right) - margin
        title_y = height - margin - 18
        for line in wrapped_lines(title, title_width, title_size):
            doc.drawString(margin, title_y, line)
            title_y -= 19 if first else 14
        doc.setFont(font, 9)
        if first:
            info_y = min(height - margin - 39, title_y - 3)
            doc.drawString(margin, info_y, "FrameForge 工程 PDF · 完整备份见 PDF 附件")
            doc.drawString(margin, info_y - 17, f"镜头 {len(shots)} · 素材 {len(assets)} · {project.get('fps', '')} fps · {project.get('aspect_ratio', '')}")
            doc.drawString(margin, info_y - 34, f"导出时间 UTC {generated_at}")
            doc.setFont(font, 7)
            doc.drawString(margin, info_y - 51, "二维码仅用于核对摘要与 SHA-256，完整工程数据保存在 PDF 附件中。")
            code = qr.QrCodeWidget(manifest)
            bounds = code.getBounds()
            side = 72
            scale = side / (bounds[2] - bounds[0])
            drawing = Drawing(side, side, transform=[scale, 0, 0, scale, 0, 0])
            drawing.add(code)
            renderPDF.draw(drawing, doc, right - side, height - margin - side - 4)
            y = info_y - 80
        else:
            y = title_y - 25
        doc.setStrokeColorRGB(0.75, 0.78, 0.80)
        doc.line(margin, y + 11, right, y + 11)
        doc.setFont(font, 8)
        doc.drawRightString(right, 26, f"第 {page_number} 页 · FrameForge 工程 PDF")

    def wrapped_lines(value: object, max_width: float, size: int = 9) -> list[str]:
        text = _plain(value)
        lines: list[str] = []
        for paragraph in text.split("\n"):
            line, line_width = "", 0.0
            for char in paragraph:
                char_width = pdfmetrics.stringWidth(char, font, size)
                if line and line_width + char_width > max_width:
                    lines.append(line)
                    line, line_width = "", 0.0
                line += char
                line_width += char_width
            lines.append(line)
        return lines or [""]

    page_header(True)
    if not shots:
        doc.setFont(font, 10)
        doc.drawString(margin, y - 18, "工程暂无镜头。")
    for index, shot in enumerate(shots, 1):
        if not isinstance(shot, dict):
            continue
        if y < 96:
            page_header(False)
        number = _plain(shot.get("number") or f"{index:03d}")
        title = _plain(shot.get("title") or "未命名镜头")
        doc.setFont(font, 11)
        for line in wrapped_lines(f"SHOT {number}  {title}", right - margin, 11):
            if y < 75:
                page_header(False)
            doc.drawString(margin, y, line)
            y -= 16
        doc.setFont(font, 8)
        scene = _plain(shot.get("scene"))
        duration = shot.get("duration_frames", "")
        for line in wrapped_lines(f"场景 {scene or '—'}  ·  时长 {duration} 帧", right - margin, 8):
            if y < 72:
                page_header(False)
            doc.drawString(margin, y, line)
            y -= 13
        for label, key in (("画面", "description"), ("旁白", "voiceover")):
            value = _plain(shot.get(key))
            if not value:
                continue
            for line in wrapped_lines(f"{label}  {value}", right - margin, 9):
                if y < 72:
                    page_header(False)
                doc.setFont(font, 9)
                doc.drawString(margin, y, line)
                y -= 14
        y -= 14
        doc.setStrokeColorRGB(0.88, 0.89, 0.90)
        doc.line(margin, y + 6, right, y + 6)
        y -= 15
    doc.save()
    return output.getvalue()


def _reader(pdf_bytes: bytes) -> PdfReader:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=True)
        if reader.is_encrypted:
            raise ProjectPdfError("加密 PDF 不支持工程封装或导入")
        if not reader.pages:
            raise ProjectPdfError("PDF 没有页面")
        return reader
    except ProjectPdfError:
        raise
    except Exception as exc:
        raise ProjectPdfError("PDF 文件损坏或无法读取") from exc


def _validate_backup(backup_bytes: bytes, max_backup_bytes: int) -> None:
    if not isinstance(backup_bytes, bytes) or not backup_bytes or len(backup_bytes) > max_backup_bytes:
        raise ProjectPdfError("完整工程备份为空或超过大小限制")
    try:
        bundle = json.loads(backup_bytes)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ProjectPdfError("工程附件不是有效 JSON") from exc
    if not isinstance(bundle, dict) or not isinstance(bundle.get("project"), dict) or not isinstance(bundle.get("shots"), list):
        raise ProjectPdfError("工程附件缺少项目或镜头数据")
    archive = bundle.get("_backup")
    if not isinstance(archive, dict) or archive.get("version") != 2 or not isinstance(archive.get("tables"), dict) or not isinstance(archive.get("files"), dict):
        raise ProjectPdfError("工程附件不是完整的第 2 版备份")


def _add_invisible_mark(writer: PdfWriter, digest: str) -> None:
    """Place a non-rendering text mark on the first page (PDF text mode 3)."""
    page = writer.pages[0]
    resources = DictionaryObject(dict(page.get("/Resources", DictionaryObject())))
    fonts = DictionaryObject(dict(resources.get("/Font", DictionaryObject())))
    fonts[NameObject("/FFWatermark")] = DictionaryObject(
        {NameObject("/Type"): NameObject("/Font"),
         NameObject("/Subtype"): NameObject("/Type1"),
         NameObject("/BaseFont"): NameObject("/Helvetica")}
    )
    resources[NameObject("/Font")] = fonts
    page[NameObject("/Resources")] = resources
    stream = DecodedStreamObject()
    stream.set_data(
        f"q BT /FFWatermark 1 Tf 3 Tr 1 0 0 1 0 0 Tm (FFPDF1:{digest}) Tj ET Q\n".encode("ascii")
    )
    mark_ref = writer._add_object(stream)
    current = page.get("/Contents")
    if isinstance(current, ArrayObject):
        page[NameObject("/Contents")] = ArrayObject([*current, mark_ref])
    elif current is None:
        page[NameObject("/Contents")] = mark_ref
    else:
        page[NameObject("/Contents")] = ArrayObject([current, mark_ref])


def embed_project_backup(
    pdf_bytes: bytes,
    backup_bytes: bytes,
    *,
    max_pdf_bytes: int = DEFAULT_MAX_PDF_BYTES,
    max_backup_bytes: int = DEFAULT_MAX_BACKUP_BYTES,
) -> bytes:
    """Return a new PDF carrying exactly the supplied complete backup bytes."""
    if not isinstance(pdf_bytes, bytes) or not pdf_bytes or len(pdf_bytes) > max_pdf_bytes:
        raise ProjectPdfError("PDF 为空或超过大小限制")
    _validate_backup(backup_bytes, max_backup_bytes)
    reader = _reader(pdf_bytes)
    if any(item.name == ATTACHMENT_NAME for item in reader.attachment_list):
        raise ProjectPdfError("PDF 已包含 FrameForge 工程附件")
    digest = hashlib.sha256(backup_bytes).hexdigest()
    try:
        writer = PdfWriter(clone_from=reader)
        attachment = writer.add_attachment(ATTACHMENT_NAME, backup_bytes)
        attachment.subtype = NameObject("/application#2Fjson")
        attachment.size = NumberObject(len(backup_bytes))
        _add_invisible_mark(writer, digest)
        writer.add_metadata({
            "/FrameForgeFormat": FORMAT_VERSION,
            "/FrameForgeBackupSHA256": digest,
            "/FrameForgeWatermark": f"FFPDF1:{digest}",
        })
        output = io.BytesIO()
        writer.write(output)
        return output.getvalue()
    except Exception as exc:
        raise ProjectPdfError("工程 PDF 封装失败") from exc


def extract_project_backup(
    pdf_bytes: bytes,
    *,
    max_pdf_bytes: int = DEFAULT_MAX_PDF_BYTES,
    max_backup_bytes: int = DEFAULT_MAX_BACKUP_BYTES,
) -> bytes:
    """Verify and return the exact JSON bytes embedded in a project PDF."""
    if not isinstance(pdf_bytes, bytes) or not pdf_bytes or len(pdf_bytes) > max_pdf_bytes:
        raise ProjectPdfError("PDF 为空或超过大小限制")
    reader = _reader(pdf_bytes)
    metadata = reader.metadata or {}
    if metadata.get("/FrameForgeFormat") != FORMAT_VERSION:
        raise ProjectPdfError("这不是可完整导入的 FrameForge 工程 PDF")
    digest = metadata.get("/FrameForgeBackupSHA256")
    if not isinstance(digest, str) or len(digest) != 64 or any(ch not in "0123456789abcdef" for ch in digest):
        raise ProjectPdfError("工程 PDF 校验信息无效")
    try:
        matches = [item for item in reader.attachment_list if item.name == ATTACHMENT_NAME]
    except Exception as exc:
        raise ProjectPdfError("工程 PDF 附件损坏") from exc
    if len(matches) != 1:
        raise ProjectPdfError("工程 PDF 缺少唯一的完整备份附件")
    declared_size = matches[0].size
    if declared_size is not None and (declared_size < 0 or declared_size > max_backup_bytes):
        raise ProjectPdfError("工程 PDF 附件超过大小限制")
    try:
        backup_bytes = matches[0].content
    except Exception as exc:
        raise ProjectPdfError("工程 PDF 附件损坏") from exc
    if (
        (declared_size is not None and declared_size != len(backup_bytes))
        or len(backup_bytes) > max_backup_bytes
        or hashlib.sha256(backup_bytes).hexdigest() != digest
    ):
        raise ProjectPdfError("工程 PDF 附件哈希校验失败或超过大小限制")
    if metadata.get("/FrameForgeWatermark") != f"FFPDF1:{digest}":
        raise ProjectPdfError("工程 PDF 不可见水印与附件不一致")
    _validate_backup(backup_bytes, max_backup_bytes)
    return backup_bytes
