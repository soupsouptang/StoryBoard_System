# FRAMEFORGE Screen Parity Matrix

## 2026-10-04 行下详情与放大预览

真实3002合成12镜头／8种字段消费本轮实现：末行展开自动上滚，最新卡片本体352px、内容区24px内边距；桌面缩略图240×144px，图片/紧凑信息/长文本有不同尺寸。1440／1024／768／375／320无根、卡片体横向溢出；末行完整footer可见，短屏借内容区纵向滚动保持本体高度。横向滚动只移表格数据，详情宽度/左侧保持可视内容区。保存成功保持展开、dirty第一次Esc询问/第二次丢弃、改回原值不询问、隐藏列灰色只读、取消焦点回镜头行、切换另一镜头仅关闭；真实字段保存一次undo恢复标题/时长/custom values。

现有表格图点击直接居中预览，1440宽608px（内容1216px的一半）；其余宽度400／288／288／288px，稳定后中心偏移0、无窗口横向溢出。50/300端点按钮禁用，25%按钮步进、滑杆、下载/替换icon及Esc保留；200%放大基点实测中心X/Y偏移0。列管理、表头与单元格右键菜单实际开关和截图保留本机。ShotDetailCard截图为outputs/shot-detail-2026-10-04.png；preview及menu截图同目录。Chrome自动上传需扩展file URL权限，未代为开启；下载事件未收到完成回执。两个实际文件操作门槛BLOCKED_VISUAL，其余本轮状态INTEGRATED_NOT_CUT_OVER；共享reduced-motion CSS保留，未改系统设置做专项实机切换。不提高全站状态。[本轮详细记录](SHOT_DETAIL_2026-10-04.md)。


## 2026-10-03 项目撤销重做实际消费

项目设置左侧共享Button撤销/重做。Chrome3002独立合成项目真实验证创建undo/快捷键redo、列宽恢复、刷新后Ctrl+Y、后插列一次undo/redo、弹窗原生输入undo/Esc、键盘焦点及列管理/表头右键菜单。1440/1024/768/375/320无根溢出，14px/32px按钮可见；截图outputs/project-undo-redo-2026-10-03.png仅留工作区。INTEGRATED_NOT_CUT_OVER，不提升全站视觉或原生画板/灯光状态。[实施记录](PROJECT_HISTORY_2026-10-03.md)。

## 2026-10-03 centered cards acceptance (`0e12efa`)

The latest user request moves new-Shot authoring and bottom notifications into centered cards. The actual shots route now mounts the existing NewShotModal; bottom NewShotRow is removed. Feedback and bulk-trash confirmation use root shared Dialog. Card/Wall creation continues consuming the same modal. Existing floating dialogs allow Esc; unsent draft/deletion cancellation causes no request, while already-submitted requests are not falsely rolled back.

Real local3002 acceptance: centered authoring and protected-column feedback, Escape/reopen3s, deletion confirmation cancelled with Shot/selection retained, import/trash/saved-view/custom-field cancellation, focus return to the creation button. 1440/1024/768/375/320 widths have no root/card horizontal overflow;375×667 internal scrolling keeps cancellation keyboard reachable. Screenshot centered-new-shot-2026-10-03.png remains local. Production build and targeted checks pass; no production deployment/data writes or full-app visual acceptance claimed. The broader BLOCKED_VISUAL gates below are unchanged.

## 2026-10-02 rendered increment (`095fb7a`)

The crop dialog refactor retains the framing destination through the existing Asset Library, replacing version-file creation with source-preserving metadata commands. It is not a removal of crop capability. Synthetic3002/8002 PostgreSQL-backed UI was used; original3001 remains separate.

| Route / surface | Fresh rendered evidence | Remaining visual/product gate |
| --- | --- | --- |
| assets / ImageCropDialog | Actual source canvas, ratios/flip/rotation/pan/zoom, local Undo/Redo, save and cancellation;9:16 output with original retained | Component-specific Panel/project editors and full keyboard/focus/gesture QA remain; INTEGRATED_NOT_CUT_OVER |
| shots / column manager |9 builtin /20 preset /custom/trash sections;mirror soft-delete, same001 restored;voice-over preset added |10 pending mappings, complete preset Purge and all table configurations remain; existing broad BLOCKED_VISUAL retained |
| review / project compare | Actual Before/After original horizontal versus framed vertical image | Project restore/merge/global undo and full Review desktop acceptance remain; broad BLOCKED_VISUAL retained |
| deliverables | Saved title-only field template reloads after refresh;actual PDF renders1/1 with only chosen title data | Full PDF layouts/profile/watermarks and broader format parity remain; INTEGRATED_NOT_CUT_OVER |

Evidence kept locally at `/Users/montblanc/Documents/Codex/2026-09-30/new-chat/media-before-after-qa.png` and `export-template-pdf-qa.png`; no user files uploaded. Supplemental crop-width checks do not promote full desktop core surfaces to PASS. No deployment or complete product acceptance is claimed. See [implementation §9](VNEXT_DATABASE_IMPLEMENTATION_2026-10-02.md#9-非破坏图片三类列与交付字段第六段).

This document tracks VNext screen recovery against the accepted FRAMEFORGE product behavior. It does not require Legacy runtime/API/database compatibility; Legacy screens are visual/functional references only.

2026-10-01 re-audit and full desktop redesign proposal: [shadcn UI roadmap](SHADCN_UI_REDESIGN_ROADMAP_2026-10-01.md). Code checkpoint: `ae62318`; this is not fresh runtime acceptance. Historical approval-status controls are not automatically recovery requirements: the component master specification restricts approval workflows. Preserve comments, versions, diff and per-change accept/reject; map historical statuses separately.

Status vocabulary:
- VERIFIED
- IMPLEMENTED_NOT_INTEGRATED
- INTEGRATED_NOT_CUT_OVER
- CUTOVER_READY
- CUT_OVER
- LEGACY_RETIRED
- BLOCKED
- BLOCKED_VISUAL

## Web UI Pages (apps/web)

| Baseline Screen | VNext Route | Status | Notes |
| :--- | :--- | :--- | :--- |
| /login | /login | INTEGRATED_NOT_CUT_OVER | Real auth UI exists, but full visual/product parity and runtime cutover evidence are not sufficient for CUTOVER_READY. |
| /projects | /productions | INTEGRATED_NOT_CUT_OVER | Authenticated cover media and monogram fallback render in synthetic browser QA at 1440/1024/768/375/320; 320 dark/light checked. Representative visual QA remains; Legacy media-copy migration is out of scope. |
| /projects/[id] entry | /production/[id] | VERIFIED | Route is now a redirect to the selected Shot workspace; unauthorized feature-card overview is no longer the product path. |
| /projects/[id]/shots | /production/[id]/shots | BLOCKED_VISUAL | Real V-API consumer; selection/Inspector are decoupled, inline/custom-field editing, column manager, saved layouts, filtering, sorting and grouping are live. The visible primary `新建镜头` entry regressed during the page rewrite and has now been restored through the real `NewShotModal`. Primary action/count and query/tools now occupy separate wrapping rows; the bulk toolbar is in flow and its three controls use shared Radix Select. Synthetic 1440 light/dark toolbar and Inspector coexistence, real bulk-save persistence and Space/Escape focus return were checked. Full field/density/truncation/right-side parity remains incomplete; this screen is not visually accepted. |
| /projects/[id]/timeline | /production/[id]/timeline | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline timeline behavior. |
| /projects/[id]/storyboard | /production/[id]/storyboard | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline storyboard/wall behavior. |
| /projects/[id]/deliverables | /production/[id]/deliverables | INTEGRATED_NOT_CUT_OVER | CSV/EDL/OTIO/SRT use real V-API; PDF/Word/layout parity remains incomplete. |
| /projects/[id]/review | /production/[id]/review | BLOCKED_VISUAL | Persisted comments, reply/quote authoring, version operations and Before–After compare have consumers. The consumer now restores the queue / real Panel image / comments-and-versions regions, stable Shot-ID selection and the version snapshot submission entry. Synthetic component checks cover selection after reorder, real media references, snapshot dispatch, readonly access and failure retention; fresh desktop acceptance remains pending. Word-style per-change accept/reject still needs contract and UI parity. Do not equate whole-version accept, per-change audit and historical approval statuses, or restore approval workflows from the old baseline automatically. |
| /projects/[id] method groups | /production/[id]/methods | BLOCKED_VISUAL | Real Shot primary and secondary methods participate in groups and table filters; auxiliary editing uses the revision-bound Inspector command. Cross-group selection deduplicates Shot IDs. Group row navigation and revision-bound auxiliary save were checked against the local synthetic API at 1440; light/dark group layout inspected. Dedicated row context actions and complete parity remain. Cards/wall/timeline primary-only display matches the Golden Baseline. |
| /projects/[id] production overview | /production/[id]/overview | BLOCKED_VISUAL | Baseline total/LIVE/STOCK/AE+VFX metrics use real primary/secondary Shot groups. Empty and error states have synthetic rendered checks; 1440 light/dark real API metrics (3 total / 2 LIVE / 0 STOCK / 1 post task) inspected. Full parity remains pending. |
| /projects/[id] asset library | /production/[id]/assets | INTEGRATED_NOT_CUT_OVER | Real scoped asset metadata replaces fabricated Shot records/counts/files. MIME/unused filters, search, authenticated preview, active Shot reference counts and upload-to-Shot entry are connected. Synthetic 1440 light/dark grid, preview, search/unused empty state checked; standalone upload/cleanup, durable VNext media storage and full baseline visual parity remain. |
| /projects/[id]/narration | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/moodboard | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/planning / lighting | N/A | BLOCKED | Baseline scene-planning/lighting capability not yet migrated. |

## Visual gate

Current gate is **desktop-first**. The active required rendered evidence is **1440×900** for Shell / Project Hub, Shot Table, Inspector and Review. Current status is `BLOCKED_VISUAL / FAIL`.

Do not test or use 1024×768, 768×1024, 375×812 or 320×568 as an acceptance requirement until those four desktop core surfaces pass. Those sizes remain deferred work, not cancelled scope.

At 1440, check information hierarchy, table scroll/sticky ownership, toolbar density, text truncation, Inspector width/open lifecycle, Review decision affordances, conflict states and focus/keyboard behavior. A shadcn import, successful build or absence of document-level horizontal scroll does not promote a screen to visual PASS.
