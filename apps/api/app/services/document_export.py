"""Genuine XLSX/DOCX/PDF from the canonical production and asset records."""
from __future__ import annotations
import io
import json
from html import escape
from pathlib import Path
from functools import lru_cache
from starlette.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.exceptions import DomainError, NotFoundError
from app.models.production import Production, Sequence
from app.models.shot import Shot
from app.models.asset import Asset
from app.models.field import ProjectColumn, ShotColumnValue
from app.services.panel_media_service import MEDIA_ROOT
from app.services.timecode_format import frames_to_tc

# Only resolved persisted fields are exported; req. 11's pending semantics remain in the DB plan.
COLUMNS = [('display_number','镜号'), ('name','镜头标题'), ('sequence','篇章'), ('tc','时码 TC'), ('duration_frames','帧数'), ('duration','时长（秒）'), ('shot_size','景别'), ('lens_mm','焦段'), ('camera_movement','运镜'), ('camera_angle','机位角度'), ('description','画面描述'), ('voice_over','对应旁白'), ('primary_method','制作方式'), ('status','状态'), ('department','责任部门'), ('performance','表演提示'), ('dialogue','对白'), ('director_notes','导演备注'), ('action','动作'), ('panel_frame','分镜图框')]
MIMES = {'xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'pdf':'application/pdf'}

async def export_document(db, production_id, fmt, user):
    if fmt not in MIMES: raise DomainError('不支持的导出格式', code='VALIDATION_ERROR')
    permissions = getattr(getattr(user, 'role', None), 'permissions', None) or {}
    if not (permissions.get('*') or permissions.get('production.read')):
        raise DomainError('当前账号没有导出项目的权限', code='FORBIDDEN')
    prod = (await db.execute(select(Production).where(Production.id == production_id, Production.deleted_at.is_(None)))).scalar_one_or_none()
    if prod is None: raise NotFoundError('项目不存在')
    shots = list((await db.execute(select(Shot).options(selectinload(Shot.panels)).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)).order_by(Shot.sort_index, Shot.id).limit(2001))).scalars())
    if len(shots) > 2000: raise DomainError('单次文档导出最多 2000 镜头，请拆分项目或使用 CSV。', code='VALIDATION_ERROR')
    fields = list((await db.execute(select(ProjectColumn).where(ProjectColumn.production_id == production_id, ProjectColumn.state == "active").order_by(ProjectColumn.sort_index, ProjectColumn.id))).scalars())
    values = {(value.shot_id,value.column_id): value.value for value in (await db.execute(select(ShotColumnValue).join(Shot, Shot.id == ShotColumnValue.shot_id).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)))).scalars()}
    sequences = {s.id:s.name for s in (await db.execute(select(Sequence).where(Sequence.production_id == production_id))).scalars()}
    assets = {a.id:a for a in (await db.execute(select(Asset).where(Asset.production_id == production_id, Asset.deleted_at.is_(None)))).scalars()}
    fps = prod.fps_num / (prod.fps_den or 1)
    frame = prod.start_timecode_frames
    records = []
    root = MEDIA_ROOT.resolve()
    total_media = 0
    for shot in shots:
        record = {key:getattr(shot,key,None) for key,_ in COLUMNS}
        record.update(sequence=sequences.get(shot.sequence_id,''), tc=frames_to_tc(frame, fps, prod.drop_frame), duration=shot.duration_frames/fps)
        frame += shot.duration_frames
        record['camera_movement'] = ' / '.join(str(v) for v in shot.camera_movement.values())
        record['primary_method'] = ' / '.join([shot.primary_method, *shot.secondary_methods])
        for field in fields: record[field.id] = values.get((shot.id,field.id))
        media = []
        for panel in sorted(shot.panels,key=lambda p:(p.sort_index,p.id)):
            asset = assets.get(panel.asset_id)
            if panel.deleted_at is not None or asset is None: continue
            path = (root/asset.storage_key).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                raise DomainError(f'SHOT {shot.display_number} 素材文件缺失，无法完整导出。', code='MISSING_MEDIA')
            total_media += path.stat().st_size
            if total_media > 64*1024*1024: raise DomainError('导出图片超过 64 MB，请拆分。',code='VALIDATION_ERROR')
            media.append(path.read_bytes())
        records.append((record,media))
    columns = COLUMNS + [(field.id,field.label) for field in fields]
    return prod.name, await run_in_threadpool(render_document, prod.name, records, columns, fmt)


def text(value):
    if value is None: return ''
    return json.dumps(value, ensure_ascii=False) if isinstance(value,(dict,list)) else str(value)


def render_document(title, records, columns, fmt):
    output = io.BytesIO()
    if fmt == 'xlsx':
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font
        from openpyxl.drawing.image import Image as ExcelImage
        from openpyxl.utils import get_column_letter
        workbook = Workbook(); sheet = workbook.active; sheet.title='分镜制作'
        sheet.append(['分镜画面', *[label for _,label in columns]])
        sheet.freeze_panes = 'C2'; sheet.auto_filter.ref = f'A1:{get_column_letter(len(columns)+1)}{len(records)+1}'
        streams = []
        for index,(record,media) in enumerate(records,2):
            sheet.append(['',*[text(record.get(key)) for key,_ in columns]])
            sheet.row_dimensions[index].height = max(90, len(media)*80)
            for offset, data in enumerate(media):
                stream=io.BytesIO(data); streams.append(stream)
                image=ExcelImage(stream); image.width=150; image.height=80
                # Multiple images are stacked within their owning shot row.
                from openpyxl.drawing.spreadsheet_drawing import OneCellAnchor, AnchorMarker
                from openpyxl.drawing.xdr import XDRPositiveSize2D
                from openpyxl.utils.units import pixels_to_EMU
                image.anchor=OneCellAnchor(_from=AnchorMarker(col=0,row=index-1,rowOff=pixels_to_EMU(offset*82)),ext=XDRPositiveSize2D(pixels_to_EMU(150),pixels_to_EMU(80)))
                sheet.add_image(image)
        for row in sheet:
            for cell in row:
                # Never execute source text beginning with '=' as an Excel formula.
                cell.data_type='s'; cell.font=Font(name='Satoshi',bold=cell.row==1)
                cell.alignment=Alignment(vertical='top',wrap_text=True)
        for index in range(1,len(columns)+2): sheet.column_dimensions[get_column_letter(index)].width=24
        workbook.save(output)
    elif fmt == 'docx':
        from docx import Document
        from docx.shared import Inches
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        document = Document(); style=document.styles['Normal']; style.font.name='Satoshi'
        fonts=OxmlElement('w:rFonts'); fonts.set(qn('w:eastAsia'),'Sarasa UI SC'); style.element.get_or_add_rPr().append(fonts)
        document.add_heading(title,0)
        for record,media in records:
            document.add_heading('SHOT '+text(record.get('display_number')),1)
            table=document.add_table(rows=1,cols=2); table.style='Table Grid'
            table.rows[0].cells[0].text='字段'; table.rows[0].cells[1].text='内容'
            cells=table.add_row().cells; cells[0].text='分镜画面'
            for data in media: cells[1].paragraphs[0].add_run().add_picture(io.BytesIO(data),width=Inches(5))
            for key,label in columns:
                cells=table.add_row().cells; cells[0].text=label; cells[1].text=text(record.get(key))
            document.add_page_break()
        document.save(output)
    elif fmt == 'pdf':
        from reportlab.pdfbase import pdfmetrics
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Image, Spacer, PageBreak
        from reportlab.lib.pagesizes import A4
        fonts = pdf_fonts()
        style=ParagraphStyle('body',fontName='Satoshi',fontSize=10,leading=14,wordWrap='CJK')
        flow=[]
        for index,(record,media) in enumerate(records):
            if index: flow.append(PageBreak())
            flow.extend([Paragraph(pdf_text(title, fonts),style), Paragraph(pdf_text('SHOT '+text(record.get('display_number')), fonts),style),Spacer(1,12)])
            for data in media:
                image=Image(io.BytesIO(data)); scale=min(450/image.imageWidth,230/image.imageHeight)
                image.drawWidth=image.imageWidth*scale; image.drawHeight=image.imageHeight*scale
                flow.extend([image,Spacer(1,8)])
            for key,label in columns:
                value=text(record.get(key))
                if value: flow.append(Paragraph(pdf_text(label+'：'+value, fonts),style))
        if not flow: flow=[Paragraph(pdf_text(title+' · 暂无镜头', fonts),style)]
        SimpleDocTemplate(output,pagesize=A4).build(flow)
    else: raise ValueError('Unsupported export format')
    return output.getvalue()

@lru_cache(maxsize=1)
def pdf_fonts():
    """Decode the same licensed, checked-in fonts used by the web app, once."""
    from fontTools.ttLib import TTFont as FontFile
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    root = Path(__file__).resolve().parents[3] / 'web' / 'public' / 'fonts'
    fonts=[]
    for index, path in enumerate([root/'satoshi-regular.woff2', *sorted(root.glob('sarasa-*.woff2'))]):
        name = 'Satoshi' if index == 0 else f'Sarasa{index}'
        font=FontFile(path); cmap=set(font.getBestCmap()); font.flavor=None
        # Sarasa web subsets share their original PostScript name; ReportLab
        # must distinguish them to keep every glyph's Unicode mapping.
        for record in font['name'].names:
            if record.nameID == 6: record.string = name.encode(record.getEncoding())
        stream=io.BytesIO(); font.save(stream); stream.seek(0)
        pdfmetrics.registerFont(TTFont(name,stream))
        fonts.append((name,cmap))
    return fonts


def pdf_text(value, fonts):
    runs=[]; last=None; run=''
    for char in value:
        if char == '\n':
            if run: runs.append(f'<font name="{last}">{escape(run)}</font>'); run=''
            runs.append('<br/>'); last=None; continue
        name=next((name for name,cmap in fonts if ord(char) in cmap),'Satoshi')
        if name != last and run: runs.append(f'<font name="{last}">{escape(run)}</font>'); run=''
        run+=char; last=name
    if run: runs.append(f'<font name="{last}">{escape(run)}</font>')
    return ''.join(runs)
