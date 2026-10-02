"""Map table rows to the canonical Shot creation command."""
from __future__ import annotations

import base64
import math
import re
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainError, NotFoundError
from app.models.production import Production, Sequence
from app.models.shot import Shot, Panel
from app.models.field import CustomFieldDefinition
from app.schemas.custom_field import CustomFieldCreate, CustomFieldValuePatch
from app.services.custom_field_service import CustomFieldService
from app.services.document_import import validate_image, MAX_ROWS, MAX_COLUMNS
from app.services.legacy_import_adapter import legacy_module
from app.services.panel_media_service import PanelMediaService, MEDIA_ROOT
from app.models.user import User
from app.schemas.shot import ShotCreate
from app.services.shot_service import ShotService


class ImportService:
    @staticmethod
    async def require_production(db, production_id, user, *, for_update=False):
        ShotService._require_write(user)
        query = select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        if for_update: query = query.with_for_update()
        production = (await db.execute(query)).scalar_one_or_none()
        if production is None: raise NotFoundError('项目不存在')
        return production

    @staticmethod
    async def commit_table_import(
        db: AsyncSession,
        production_id: str,
        *,
        rows: list[list[str]],
        mapping: dict[str, dict[str, Any]],
        sequence_id: str | None,
        user: User,
        headers: list[str] | None = None,
        images: list[dict] | None = None,
    ) -> dict[str, bool | int]:
        prod = await ImportService.require_production(db, production_id, user, for_update=True)
        if len(rows) > MAX_ROWS or any(len(r) > MAX_COLUMNS or any(len(c) > 10000 for c in r) for r in rows):
            raise DomainError('导入超过 10000 行 / 200 列或单元格超过 10000 字符', code='VALIDATION_ERROR')
        if any(type(info.get('col')) is not int or not 0 <= info['col'] < MAX_COLUMNS for info in mapping.values()):
            raise DomainError('导入字段的列号必须是有效整数', code='VALIDATION_ERROR')
        if headers is not None and (len(headers) > MAX_COLUMNS or any(len(h) > 1000 for h in headers)):
            raise DomainError('导入表头过长或过多', code='VALIDATION_ERROR')
        decoded_images = {}
        if len(images or []) > 1000 or sum(len(i.get('data_base64', '')) for i in images or []) > 64 * 1024 * 1024:
            raise DomainError('导入图片过多或过大', code='VALIDATION_ERROR')
        for image in images or []:
            index = image.get('row_index')
            if type(index) is not int or not 0 <= index < len(rows) or not any(c.strip() for c in rows[index]):
                raise DomainError('图片无法关联有效镜头行', code='VALIDATION_ERROR')
            try:
                data = base64.b64decode(image.get('data_base64', ''), validate=True)
                validate_image(data)
            except Exception as exc:
                raise DomainError('图片数据损坏或过大', code='VALIDATION_ERROR') from exc
            decoded_images.setdefault(index, []).append((image.get('filename', 'image.png'), data))
        fields = []
        for column in legacy_module('import_parsing').build_import_custom_columns(headers or [], mapping):
            if not any(column['source_col'] < len(row) and row[column['source_col']].strip() for row in rows): continue
            field = (await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.production_id == production_id, CustomFieldDefinition.key == column['key']))).scalar_one_or_none()
            if field is not None and (field.is_purged or not field.is_active):
                raise DomainError('源字段已归档或永久删除，请先核对自定义列。', code='FIELD_KEY_PURGED')
            if field is None:
                created = await CustomFieldService.create_field(db, production_id, CustomFieldCreate(key=column['key'], label=column['label'], field_type='textarea', group_name='导入原文', description=f"源列 {column['source_col']+1}：{headers[column['source_col']]}"[:1000]), user)
                field = await db.get(CustomFieldDefinition, created['id'])
            fields.append((column['source_col'], field.id))
        fps = prod.fps_num / (prod.fps_den or 1)

        sequence_query = select(Sequence).where(Sequence.production_id == production_id)
        if sequence_id:
            sequence_query = sequence_query.where(Sequence.id == sequence_id)
        sequence = (await db.execute(sequence_query.limit(1))).scalar_one_or_none()
        if sequence_id and sequence is None:
            raise DomainError("导入篇章不属于当前项目", code="VALIDATION_ERROR")
        sequence_id = sequence.id if sequence else None

        current_sort = (await db.execute(
            select(func.coalesce(func.max(Shot.sort_index), 0.0)).where(Shot.production_id == production_id)
        )).scalar() or 0.0
        used_numbers = set((await db.execute(select(Shot.display_number).where(Shot.production_id == production_id, Shot.deleted_at.is_(None)))).scalars())
        imported_count = 0
        for row_index, row in enumerate(rows):
            if not any(cell.strip() for cell in row):
                continue
            values = {
                field: row[info.get("col", -1)].strip()
                if 0 <= info.get("col", -1) < len(row) else ""
                for field, info in mapping.items()
            }
            current_sort += 1000.0
            next_number = int(current_sort / 1000)
            while f"{next_number:03d}" in used_numbers: next_number += 1
            number = values.get("number") or f"{next_number:03d}"
            used_numbers.add(number)

            duration = values.get("duration", "")
            frames = values.get("duration_frames", "")
            if frames and re.fullmatch(r'[0-9]{1,16}',frames):
                duration_frames = int(frames)
            elif duration:
                try:
                    seconds = float(re.sub(r'(秒|s)$', '', duration.strip(), flags=re.I).strip())
                    if not math.isfinite(seconds) or seconds <= 0: raise ValueError('Invalid duration')
                    duration_frames = max(1, int(round(seconds * fps)))
                except (ValueError, OverflowError):
                    raise DomainError(f'第 {row_index+1} 行时长无效', code='VALIDATION_ERROR')
            else:
                duration_frames = 75

            if (frames and not re.fullmatch(r'[0-9]{1,16}',frames)) or not 1 <= duration_frames <= 2**53 - 1:
                raise DomainError(f'第 {row_index+1} 行帧数无效', code='VALIDATION_ERROR')

            methods = [part.strip() for part in (values.get('primary_method') or 'live').lower().split('/')]
            allowed_methods = {'live','stock','client','archive','still','ae','mg','three_d','vfx','type'}
            if any(method not in allowed_methods for method in methods):
                methods = ['live']
            method = methods[0]
            if len(number) > 64 or len(values.get('name','')) > 255 or len(values.get('department','')) > 64:
                raise DomainError(f'第 {row_index+1} 行镜号、标题或部门超过字段长度', code='VALIDATION_ERROR')
            lens = None
            if values.get("lens_mm"):
                try:
                    lens = float(re.sub(r'mm$', '', values['lens_mm'].strip(), flags=re.I).strip())
                    if not math.isfinite(lens) or lens <= 0: raise ValueError('Invalid lens')
                except ValueError:
                    raise DomainError(f'第 {row_index+1} 行焦段无效',code='VALIDATION_ERROR')

            shot = await ShotService.create_shot(db, production_id, ShotCreate(
                sequence_id=sequence_id,
                display_number=number,
                name=values.get("name") or f"镜头 {number}",
                description=values.get("description", ""),
                voice_over=values.get("voiceover", ""),
                camera_movement={"type": values.get("movement", "固定")},
                duration_frames=duration_frames,
                shot_size=values.get("shot_size", "全景"),
                lens_mm=lens,
                camera_angle=values.get("camera_angle", "平视"),
                primary_method=method, secondary_methods=methods[1:],
                dialogue=values.get('dialogue',''), performance=values.get('performance',''), action=values.get('action',''), panel_frame=values.get('panel_frame',''), status=values.get('status') or 'draft',
                department=values.get("department", "camera"),
                owner_id=values.get("owner_id", ""),
                director_notes=values.get("director_notes", ""),
            ), user)
            for col, field_id in fields:
                value = row[col] if col < len(row) else ''
                if value: await CustomFieldService.patch_value(db, shot.id, field_id, CustomFieldValuePatch(revision=shot.revision, value=value), user)
            for index, (filename, data) in enumerate(decoded_images.get(row_index, [])):
                panel = None if index == 0 else Panel(shot_id=shot.id, display_number=chr(65+index) if index < 26 else str(index+1), sort_index=(index+1)*1000)
                if panel is not None: db.add(panel)
                mime, extension = PanelMediaService.image_format(data)
                await PanelMediaService.save_panel_image(db, shot=shot, data=data, filename=filename, mime_type=mime, extension=extension, user_id=user.id, media_root=MEDIA_ROOT, panel=panel)
            if headers is not None:
                ShotService._audit_shot_mutation(db, user_id=user.id, action='shot.import_source', shot_id=shot.id, metadata={'headers': headers, 'cells': row, 'row_index': row_index})
            imported_count += 1
        return {"ok": True, "imported_count": imported_count}
