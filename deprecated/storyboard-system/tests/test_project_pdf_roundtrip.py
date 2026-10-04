"""Isolated synthetic PDF and backup checks; no workspace or user data."""

import hashlib
import io
import json
import unittest

from project_pdf_roundtrip import (
    ProjectPdfError,
    _qr_name_preview,
    embed_project_backup,
    extract_project_backup,
    render_project_summary_pdf,
)
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def sample_pdf():
    writer = PdfWriter()
    page = writer.add_blank_page(width=595, height=842)
    page[NameObject("/Resources")] = writer._add_object(DictionaryObject({
        NameObject("/Font"): DictionaryObject({
            NameObject("/F1"): DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            })
        })
    }))
    text = DecodedStreamObject()
    text.set_data(b"BT /F1 12 Tf 72 700 Td (Synthetic storyboard shot 001) Tj ET")
    page[NameObject("/Contents")] = writer._add_object(text)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def sample_backup():
    return json.dumps({
        "project": {"name": "Synthetic"},
        "shots": [{"number": "001"}],
        "_backup": {"version": 2, "tables": {}, "files": {}},
    }, ensure_ascii=False).encode("utf-8")


class ProjectPdfRoundtripTests(unittest.TestCase):
    def test_qr_name_preview_uses_utf8_byte_limit(self):
        for name in ("长项目名称" * 13, "A" * 75):
            preview = _qr_name_preview(name)
            self.assertLessEqual(len(preview.encode("utf-8")), 72)
            self.assertTrue(preview.endswith("…"))
            self.assertTrue(name.startswith(preview[:-1]))
        self.assertEqual(_qr_name_preview("A" * 64), "A" * 64)

    def test_embedded_backup_is_byte_identical_and_page_text_survives(self):
        original = sample_pdf()
        backup = sample_backup()
        project_pdf = embed_project_backup(original, backup)
        self.assertEqual(extract_project_backup(project_pdf), backup)
        reader = PdfReader(io.BytesIO(project_pdf))
        self.assertIn("Synthetic storyboard shot 001", reader.pages[0].extract_text())
        self.assertIn(b"3 Tr", reader.pages[0].get_contents().get_data())
        self.assertEqual(reader.metadata["/FrameForgeBackupSHA256"], hashlib.sha256(backup).hexdigest())

    def test_plain_pdf_is_not_a_complete_project(self):
        with self.assertRaisesRegex(ProjectPdfError, "不是可完整导入"):
            extract_project_backup(sample_pdf())

    def test_duplicate_embed_is_rejected(self):
        project_pdf = embed_project_backup(sample_pdf(), sample_backup())
        with self.assertRaisesRegex(ProjectPdfError, "已包含"):
            embed_project_backup(project_pdf, sample_backup())

    def test_metadata_tamper_is_detected(self):
        project_pdf = embed_project_backup(sample_pdf(), sample_backup())
        writer = PdfWriter(clone_from=PdfReader(io.BytesIO(project_pdf)))
        writer.add_metadata({"/FrameForgeBackupSHA256": "0" * 64})
        output = io.BytesIO()
        writer.write(output)
        with self.assertRaisesRegex(ProjectPdfError, "哈希校验失败"):
            extract_project_backup(output.getvalue())

    def test_attachment_tamper_is_detected(self):
        project_pdf = embed_project_backup(sample_pdf(), sample_backup())
        writer = PdfWriter(clone_from=PdfReader(io.BytesIO(project_pdf)))
        next(item for item in writer.attachment_list if item.name == "frameforge-project-v1.json").content = sample_backup() + b" "
        output = io.BytesIO()
        writer.write(output)
        with self.assertRaisesRegex(ProjectPdfError, "哈希校验失败"):
            extract_project_backup(output.getvalue())

    def test_searchable_chinese_summary_has_multiple_shots(self):
        bundle = json.loads(sample_backup())
        bundle["project"].update(name="正元智慧 城建大学", fps=60, aspect_ratio="16:9")
        bundle["shots"] = [
            {"number": "001", "title": "开场", "scene": "校园", "description": "航拍校园核心区域", "voiceover": "智慧服务"},
            {"number": "002", "title": "大门", "scene": "校门", "description": "学校大门航拍", "voiceover": "旁白二"},
        ]
        backup = json.dumps(bundle, ensure_ascii=False).encode("utf-8")
        pdf = render_project_summary_pdf(bundle, backup)
        text = "\n".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)
        for phrase in ("正元智慧", "SHOT 001", "航拍校园核心区域", "智慧服务", "SHOT 002", "旁白二"):
            self.assertIn(phrase, text)
        self.assertEqual(extract_project_backup(embed_project_backup(pdf, backup)), backup)

    def test_long_project_titles_do_not_obscure_small_qr(self):
        try:
            import pypdfium2 as pdfium
            import zxingcpp
        except ImportError:
            self.skipTest("PDF raster and QR decoder are unavailable")
        for name in ("长项目名称" * 13, "A" * 64, "FrameForgeLongProjectName" * 3):
            with self.subTest(name=name[:12]):
                bundle = json.loads(sample_backup())
                bundle["project"].update(name=name, fps=60, aspect_ratio="16:9")
                bundle["shots"] = [{"number": f"{index:03d}", "title": f"镜头 {index}"}
                                   for index in range(1, 71)]
                backup = json.dumps(bundle, ensure_ascii=False).encode("utf-8")
                pdf = embed_project_backup(render_project_summary_pdf(bundle, backup), backup)
                self.assertEqual(extract_project_backup(pdf), backup)
                for dpi in (150, 200, 300):
                    document = pdfium.PdfDocument(pdf)
                    page = document[0]
                    image = page.render(scale=dpi / 72).to_pil()
                    page.close()
                    document.close()
                    decoded = zxingcpp.read_barcodes(image)
                    self.assertEqual(len(decoded), 1, f"{name[:12]} at {dpi} dpi")
                    manifest = json.loads(decoded[0].text)
                    self.assertEqual(manifest["k"], "FFPDF1")
                    self.assertEqual(manifest["s"], 70)
                    self.assertEqual(manifest["h"], hashlib.sha256(backup).hexdigest())
                    self.assertLessEqual(len(manifest["n"].encode("utf-8")), 72)
                    if len(name.encode("utf-8")) > 72:
                        self.assertTrue(name.startswith(manifest["n"].removesuffix("…")))
                        self.assertTrue(manifest["n"].endswith("…"))
                    text = "".join(PdfReader(io.BytesIO(pdf)).pages[0].extract_text().split())
                    self.assertIn(name, text)


if __name__ == "__main__":
    unittest.main()
