# 当前未提交工作交接

2026-10-05。本次整理不提交或覆盖其他 agent 草稿，不把其内容写成已验收功能。旧混合扩展账本已经存档。

## 已有 tracked 修改

- `apps/api/app/api/v1/exports.py`
- `apps/api/app/api/v1/imports.py`
- `apps/api/app/services/document_export.py`
- `apps/api/app/services/document_import.py`
- `apps/api/app/services/import_service.py`
- `apps/api/app/services/importer.py`
- `apps/api/pyproject.toml`
- `apps/api/uv.lock`
- `apps/web/package.json`
- `package-lock.json`

## 已有未跟踪模块与测试

- `apps/api/app/services/engineering_pdf.py`
- `apps/web/app/(workspace)/production/[id]/lighting/page.tsx`
- `apps/web/app/(workspace)/production/[id]/moodboard/page.tsx`
- `apps/web/components/boards/BoardCanvas2D.tsx`
- `apps/web/components/boards/BoardCanvas3D.tsx`
- `apps/web/components/boards/BoardImage.tsx`
- `apps/web/components/boards/WorkBoardsLinks.tsx`
- `apps/web/components/boards/board-model.ts`
- `apps/web/components/boards/useBoardDraft.ts`
- `apps/web/lib/hooks/useBoards.ts`
- `"deprecated/one-off/\347\224\265\345\275\261\345\210\206\351\225\234\345\210\266\344\275\234\347\263\273\347\273\237_\344\272\247\345\223\201\350\247\204\345\210\222\344\270\216\345\274\200\345\217\221\344\273\273\345\212\241.md"`
- `storyboard-system/docs/audits/REMAINING_CAPABILITY_AUDIT_2026-10-03.md`
- `tests/backend/test_export_layouts.py`
- `tests/backend/test_import_modes.py`

导入导出、工程 PDF、灯光/情绪板消费者及关联依赖修改由原编写者继续核对。接手前确认当前本地和远端差异，声明写集；不自行提交整份锁文件或旧前端草稿。UI 接入仍按当前用户要求和 montblanc08 最新修改整合。

这里登记的是存在状态，没有运行这些草稿的产品、数据库或浏览器验收。未跟踪 outputs 保留在本地，不整体上传。
