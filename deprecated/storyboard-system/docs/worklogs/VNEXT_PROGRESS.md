# FRAMEFORGE V-NEXT PROGRESS WORKLOG

## Current Phase
CONVERGENCE & CUTOVER — 2026-09-29，`7b3a24c` 基线。本文件下方旧里程碑保留为历史实施记录；其“完成”“可发布”措辞不代表当前 monorepo 架构已切换。当前 owner 与门槛见 [CANONICAL_OWNER_MATRIX.md](../CANONICAL_OWNER_MATRIX.md) 和 [ACTIVE_WORKSTREAMS.md](../ACTIVE_WORKSTREAMS.md)。

当前事实：`apps/api`、`apps/web` 和根 `packages/*` 已有目标实现；仓库服务配置仍以 Legacy `server.py` 为入口。根/Legacy 两个 `@frameforge/ui` 同名包并存。`apps/api` 与 Legacy FastAPI 路由、Shot 版本及事务语义不同；VNext AI/Presence 尚无真实 Web 消费、持久 Job/Redis 多 worker 证据；PostgreSQL 尚无本轮真实集成/数据副本演练。状态是 `IMPLEMENTED_NOT_INTEGRATED` 或 `INTEGRATED_NOT_CUT_OVER`，逐项以 owner matrix 为准。不得据历史测试或文件存在宣称完整迁移或发布就绪。

### 2026-09-29 首批收敛切片

- 根 `AGENTS.md` 与 `CANONICAL_OWNER_MATRIX.md` 已建立；六份现况文档区分现有实现、当前运行 owner 与 cutover 门槛。
- 根 `packages/ui` 接入 Button、IconButton、Input、TextArea、Field 和 Radix tooltip；`apps/web` 登录页真实消费 Button/Input/Field。Legacy 同名包仍为旧工作区 owner，首批状态 `INTEGRATED_NOT_CUT_OVER`，Select/overlay/motion 及双消费者切换待继续。
- 补齐根共享包 TypeScript build 配置及 npm 锁文件；`apps/web` 的 Shot 展示字段与共享类型对齐。登录页不再预填开发管理员凭据。
- `apps/api` SRT 路由对齐 Legacy 字节/时间码合同；分享快照映射现有 ORM `voice_over`/`camera_movement`；注册响应预加载 role，避免异步序列化错误。这些是局部对等修复，不代表 API owner cutover。
- 验证：根 UI build、`apps/web` production build、Legacy `npm run check` 均通过；隔离 SQLite 的 export/share/Shot/auth 四组后端测试 7/7；登录页 320/375/1440 实际浏览器宽度无横向溢出，空凭据、标签与焦点可见。测试数据没有写入生产。

### 2026-09-29 第二批收敛切片（`0826adf` 之后）

- 根 `packages/ui` 迁入 Radix Select，并让 V-Web 注册表单的角色选择真实消费；旧工作区仍使用 Legacy Select，故状态仅 `INTEGRATED_NOT_CUT_OVER`。逐控件剩余门槛见 [UI_PRIMITIVE_PARITY.md](../UI_PRIMITIVE_PARITY.md)。
- [API_ROUTE_PARITY_MATRIX.md](../API_ROUTE_PARITY_MATRIX.md) 已逐路由核查 Legacy、目标 API 与未作为服务入口的 Legacy FastAPI 树，指出缺失和语义差异；这是一份代码审计，不是 API cutover。
- 根 UI 与 V-Web production build 均通过。浏览器实测 Select 在 320/375/1440 的菜单点击命中与选值；320×568 时菜单向上避让，Escape 关闭并返回焦点，键盘选择有效；三宽度无横向溢出。仍待迁 Checkbox、Popover/Menu/Modal、Icons/Motion 与旧工作区双消费者接入。

### 2026-09-29 第三批收敛切片（SRT 真实消费）

- V-Web 交付页不再用定时器假报导出成功；SRT 通过带 Bearer 的 `/api/v1/productions/{id}/export/srt` 下载 Blob，按下载头或安全备用名保存，失败在页面提示。V-API 尚未接通的 Excel/PDF/EDL/OTIO 行保留说明并标为“迁移中”，按钮禁用。
- V-Web production build 与非增量 TypeScript 检查通过。隔离 Playwright 在 320/375/1440 宽度下模拟 V-API，核对 SRT 下载内容、UTF-8 文件名、Bearer 请求与其余四项禁用；403 响应显示错误。没有使用生产数据。
- 视觉审查发现 V-Web 整体 shell 的 320px 固定侧栏遮挡交付页，移动端当前**未通过视觉验收**；桌面 1440px 页可用。此问题属于 M4 shell 门槛，不能因为无 document 横向溢出就宣称窄屏通过。

## Historical Verified Findings（旧切片，不代表当前 cutover）
- [VERIFIED] Working tree baseline SHA: `4986ac0d4af3a4829ba07cd24f95b1c5b1df6aa7`.
- [VERIFIED] Pre-change patch saved to `docs/audits/prechange-working-tree.patch`.
- [VERIFIED] `python -m py_compile server.py creative_boards.py text_format.py` succeeds without errors.
- [VERIFIED] Creative boards contract tests (`tests/test_creative_boards_contract.py`) pass 7/7.
- [VERIFIED] Lighting Scene V2 contract tests (`tests/test_lighting_scene_v2_contract.py`) pass 3/3.
- [VERIFIED] Lighting Scene V2 preset matrix tests (`tests/lighting_scene_v2_contract_qa.cjs`) pass 53/53 presets.
- [VERIFIED] Python comprehensive backend test suite (`python -m unittest discover -s tests -p "test_*.py"`) passes 47/47 (1 skipped).
- [VERIFIED] QA script repair (`tests/lighting_workspace_v8_qa.cjs`) syntax fixed, Edge fallback enabled, passes 13/13.
- [VERIFIED] `static/app.js` `renderImportMapping()` sanitized with HTML entity escaping.
- [VERIFIED] Text selection enabled for table cells and inputs in `static/styles.css`.
- [VERIFIED] Window blur listener added to `static/workspace-layout.js` to prevent column/pane drag freeze.
- [VERIFIED] `#themeToggle` SVG icons (`#icon-sun` / `#icon-moon`) added to `static/index.html` and toggled in `static/app.js`.
- [VERIFIED] Floating popover viewport boundary detection and auto-flipping implemented via `positionFloatingLayer`.
- [VERIFIED] Search bar single-shell consolidated in `src/workspace/theme.css` to 34px height, 9px radius, single focus ring, transparent inner input. Rebuilt via `node build.mjs`.
- [VERIFIED] Sidebar navigation item normalized to 36px height, 16×16px icon box, 7px radius, and standard section headers.
- [VERIFIED] Timeline media/inspector grid tuned to 68% / 32% ratio (`minmax(0, var(--timeline-media-width, 68%)) minmax(280px, 1fr)`), verified via `tests/timeline_consistency_qa.cjs`.
- [VERIFIED] Table in-place double-click cell editing verified via `tests/inline_editing_qa.cjs`.
- [VERIFIED] 47 CC0 GLB studio equipment models and 12 generic reference models integrated in `static/assets/glb/`.
- [VERIFIED] Equipment catalog cards rendered with emerald `DIGITAL TWIN` badges, `CC0 Studio` pills, wattage, and mount specs.
- [VERIFIED] Multi-mode 2D CAD, 2.5D orthographic, Split, and 3D real-time views verified via `tests/lighting_workspace_v8_qa.cjs`.
- [VERIFIED] Unified deployment platform implemented in `tools/deploy_gui.py` supporting Tkinter GUI and CLI (`--auto`, `--build-only`, `--dry-run`, `--deploy`, `--rollback`).
- [VERIFIED] Canonical release package built: `dist/releases/frameforge-release-20260916-1554-4986ac0d.zip` (8.73 MB, SHA256: `11a1c754e0f9f35bcd52cf382718168367c7ffe6e10e8ddc0c9801846e383a5d`).
- [VERIFIED] Automated deployment script with rollback trap (`deploy.sh`) generated inside release package.

## Completed Milestones
- [FIXED] P0-1: Initial audit documents created (`docs/audits/VNEXT_PRECHANGE_AUDIT.md`, `docs/audits/CSS_OWNERSHIP.md`).
- [FIXED] P0-1: Baseline safety patch generated (`docs/audits/prechange-working-tree.patch`).
- [FIXED] P0-2: Persistence contracts & V2 schema in `creative_boards.py` and `static/creative-boards.js`.
- [FIXED] P0-3: Headless QA script repairs in `tests/lighting_workspace_v8_qa.cjs`.
- [FIXED] P0-4: HTML entity escaping, text selection restore.
- [FIXED] P0-5: Window blur drag recovery, theme toggle SVG icons, popover collision detection.
- [FIXED] P1: Search shell single-box 34px/9px, sidebar 36px/16x16, timeline 68%/32%, table inline editing.
- [FIXED] P2: CC0 studio equipment library, rich equipment cards, 2D/2.5D/Split/3D digital twin runtime.
- [FIXED] P3: Unified deployment platform `tools/deploy_gui.py` (GUI + headless CLI), release zip generation, rollback trap.
- [FIXED] Documentation: Created `docs/reports/VNEXT_UI_QA.md`, `docs/reports/VNEXT_DEPLOYMENT.md`, `docs/reports/VNEXT_FINAL_ACCEPTANCE.md`.

## Key Files Modified / Created
- `creative_boards.py`
- `static/creative-boards.js`
- `static/creative-boards.css`
- `static/workspace-editor-v75.css`
- `static/workspace-flow.css`
- `src/workspace/theme.css`
- `static/workspace-v73.css` (recompiled)
- `static/app.js`
- `static/index.html`
- `static/styles.css`
- `static/workspace-layout.js`
- `tests/lighting_workspace_v8_qa.cjs`
- `tests/test_lighting_scene_v2_contract.py`
- `tests/lighting_scene_v2_contract_qa.cjs`
- `tools/deploy_gui.py`
- `../tools/deploy_gui.py`
- `docs/reports/VNEXT_UI_QA.md`
- `docs/reports/VNEXT_DEPLOYMENT.md`
- `docs/reports/VNEXT_FINAL_ACCEPTANCE.md`
- `docs/worklogs/VNEXT_PROGRESS.md`


---

# VNEXT ARCHITECTURE MIGRATION - 5 PILLARS EXECUTION WORKLOG (2026-09-29)

## Current Status: IMPLEMENTED_NOT_INTEGRATED (implementation exists; real runtime cutover pending)

### 1. PostgreSQL & Repository Layer
- **Contract Protocols**: Created `storyboard-system/repositories/contracts.py` defining `ProjectRepository`, `ShotRepository`, `FieldRepository`, and `UnitOfWork` protocols.
- **SQLite Dual-Compatibility**: Implemented `storyboard-system/repositories/sqlite_repo.py` preserving SQLite V1 transactional behavior.
- **PostgreSQL Production Target**: Implemented `storyboard-system/repositories/postgres_schema.sql` (matching baseline DDL with UUID PKs, JSONB, Timestamptz, Foreign Keys, cascade constraints) and `postgres_repo.py`.
- **Data Migration Runner**: Created `storyboard-system/repositories/migration_runner.py` for automated schema creation and data pumping between engines.
- **Verification**: `tests/test_repository_contracts.py` (4/4 tests pass).

### 2. FastAPI Backend Real Ownership
- **Configuration & Security**: Fail-closed production configuration in `apps/api/app/core/config.py` (fail on default keys when `ENVIRONMENT=production`, configurable `CORS_ORIGINS`).
- **Database Startup & Schema Governance**: Restructured lifespan in `apps/api/main.py`. Development/test mode auto-seeds; production mode delegates strictly to Alembic migrations without silent DDL mutation on boot.
- **Alembic Migration System**: Initialized Alembic in `apps/api/` with `env.py` and generated baseline migration `fdc1353e5b23_create_initial_tables.py` tracking all 18 domain tables.
- **Route Parity**: Implemented and mounted routers for `/auth`, `/productions`, `/shots`, `/imports`, `/exports`, `/shares`, `/ai`, and `/presence`.
- **Optimistic Concurrency & Reordering**: Atomic fractional reordering and revision conflict checks (`HTTP 409`) on shot mutations.

### 3. AI Provider + Job + Proposal Engine (Human-In-The-Loop)
- **Zero-Dependency Default**: Implemented `apps/api/app/services/ai_provider.py` with `BaseAIProvider`, `AIProviderRegistry`, and `MockAIProvider` (0 external network dependencies by default).
- **Proposal Lifecycle**: Created `apps/api/app/services/ai_proposal.py` and `apps/api/app/api/v1/ai.py`. Proposals are generated as `pending_review` with before/after diffs without modifying entity records.
- **Human Review**: Explicit accept/reject actions (`POST /api/v1/ai/proposals/{id}/review`). Acceptance atomically updates shot records and increments revision.
- **Verification**: Automated test pipeline in `tests/backend/test_ai_and_presence.py::test_ai_status_and_proposal_pipeline` passed.

### 4. Real-time Presence & Cell Lock Collaboration
- **Soft Cell Locking**: Implemented `SoftLockManager` in `apps/api/app/services/presence.py` preventing simultaneous overwrites during collaborative multi-user editing.
- **TTL & Session Reaping**: Configurable heartbeat (30s TTL) with automatic lock release on disconnect or expiry.
- **WebSocket Multicast**: Duplex WebSocket support (`/ws/presence/{production_id}`) and HTTP endpoints (`/api/v1/presence/rooms/{id}/heartbeat`, `/lock`, `/unlock`).
- **Verification**: Automated test pipeline in `tests/backend/test_ai_and_presence.py::test_presence_and_cell_lock_pipeline` passed.

### 5. React Workspace Decoupling & UI Components
- **MIG-002 Compliance**: In `storyboard-system/src/workspace/store.ts`, strictly decoupled `useSelectionStore` from `useInspectorStore`.
- **Collaborative Components**: Added `PresenceBar.tsx` for real-time collaborator avatars and state indicators.
- **Inspector & AI Drawers**: Added `ShotInspector.tsx` (docked/overlay tabs, Esc dismiss) and `AIProposalDrawer.tsx` (diff inspector with accept/reject buttons).
- **Build Verification**: `npm run check` in `storyboard-system` passed (TypeScript 7.0.2 + Tailwind v4 + esbuild passed with 0 errors).

### Test Suite Execution Summary
- `storyboard-system/tests`: 116 passed / 3 skipped in 15.3s.
- `tests/backend` (Pytest): 14 passed / 14 total in 3.3s.
- `tools/architecture_boundary_gate.py`: PASS.

---

# PROGRESS AUDIT — 2026-09-29 15:45 (Session 2)

## Audit Baseline
- **HEAD**: `3294d9d` on `master`; prior commits: `0826adf` (UI foundations convergence), `7b3a24c` (5-pillar implementation).
- **Working tree**: 45 files changed (1080 insertions, 2785 deletions) — primarily V-Web UI convergence and `@frameforge/ui` canonical package establishment.

## Verification Results (all GREEN)
- `tests/backend` (Pytest): **17/17 passed** in 6.0s (including new SRT export and share snapshot tests).
- `storyboard-system/tests`: **116/116 passed** (3 skipped) in 15.3s.
- `npm run check` (storyboard-system): TypeScript + Tailwind v4 + esbuild **PASS**.
- `npx tsc --noEmit` (packages/ui): **PASS**.
- `npx tsc --noEmit` (apps/web): **PASS**.
- `tools/architecture_boundary_gate.py`: **PASS**.

## Key Changes in Dirty Tree (since commit `3294d9d`)

### M2: `@frameforge/ui` Canonical Package Convergence
- Retired `packages/ui/src/primitives.css` (deprecated amber/gold fallbacks).
- Added shadcn-style components: `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `input.tsx`, `native-select.tsx`, `textarea.tsx`.
- Created `packages/ui/src/theme.css` with dark/light semantic tokens (neutral palette, Satoshi + Sarasa Gothic SC CJK).
- Added `packages/ui/components.json` for shadcn tooling compatibility.
- Added `lucide-react`, `radix-ui`, `class-variance-authority` dependencies.
- Restructured `packages/ui/src/index.ts` to export all shared components and i18n dictionary.

### M4: V-Web Full-Page UI Convergence (amber→neutral)
- Removed deprecated amber palette from all 22 V-Web route/component files.
- Login page now consumes `@frameforge/ui` `Button`, `Input`, `Field`, `Select`.
- Productions page consumes `Badge`, `Card`, `Button`, `Field`, `Input`, `Select` from canonical package.
- Storyboard components (ShotCard, StoryboardGrid, ImportModal, NewShotModal, etc.) converged to neutral semantic tokens.
- NavRail and TopBar converged to semantic CSS variables.
- ShotInspector significantly restructured with neutral tokens.
- `apps/web/tailwind.config.ts` redefined with semantic CSS variable palette.
- `apps/web/app/globals.css` restructured to consume `@frameforge/ui/theme.css` semantics.
- Deleted `apps/web/components/app-shell/IconSprite.tsx` (replaced by lucide-react).
- Added `apps/web/public/fonts/` with Satoshi and Sarasa Gothic SC WOFF2 subsets.
- Created `apps/web/lib/api-client.ts` with `apiClient()` and `apiDownload()` (real SRT download verified in test).

### Documentation Convergence
- Created `storyboard-system/docs/audits/DEPRECATED_AMBER_UI.md` documenting the amber removal inventory.
- Updated `storyboard-system/docs/CANONICAL_OWNER_MATRIX.md` with accurate per-capability states.
- Updated `storyboard-system/docs/API_ROUTE_PARITY_MATRIX.md` with full L/V/F route parity audit.
- Updated `storyboard-system/docs/ACTIVE_WORKSTREAMS.md` with convergence milestones M0–M7.
- Deleted `storyboard-system/static/m3.css` (unused Material 3 amber stylesheet).
- Corrected `storyboard-system/README.md` stale m3.css reference.

### Legacy Cleanup
- Removed 3 stale `var(--amber)` references in `storyboard-system/static/styles.css` → `var(--primary)`.

## Accurate Migration State per Canonical Owner Matrix

| Milestone | Status | Evidence |
| --- | --- | --- |
| M0 Documentation truth | VERIFIED | Docs reconciled with code facts |
| M1 Canonical owner matrix | VERIFIED | 23-row matrix audited |
| M2 `@frameforge/ui` | INTEGRATED_NOT_CUT_OVER | Login + productions consume root package; legacy UI package still active |
| M3 API/persistence | IMPLEMENTED_NOT_INTEGRATED | SRT export sub-item INTEGRATED; rest awaiting route parity |
| M4 V-Web views | IMPLEMENTED_NOT_INTEGRATED | Pages exist and build; not yet the production entry point |
| M5 AI | BLOCKED | Mock-only; no persistent job store or V-Web consumer |
| M6 Presence | IMPLEMENTED_NOT_INTEGRATED | Process-local only; Redis multi-worker pending |
| M7 PostgreSQL | BLOCKED | Alembic exists; no real PG integration test |

## No Regression
- Zero amber/yellow references remain in V-Web or root UI source.
- All existing tests pass without modification.
- Architecture boundary gate passes.
- No production deployment or data modification.

---

# DELIVERABLES EXPORT PARITY & CONFIG HARDENING — 2026-09-29 16:00 (Session 3)

## Accomplished Milestones
1. **Deliverable Exports Parity (EDL, OTIO, CSV, SRT)**:
   - Updated `apps/api/app/api/v1/exports.py`: OTIO endpoint now serializes JSON document with `Content-Disposition: attachment; filename*=UTF-8''...` for direct browser/client downloads.
   - Updated `apps/api/app/services/exporter.py`: Support both canonical `Shot` model attributes (`voice_over`, `camera_movement`) and DTO attributes (`voiceover`, `movement`) across CMX 3600 EDL and UTF-8 BOM CSV exporters.
   - Updated `apps/web/app/(workspace)/production/[id]/deliverables/page.tsx`: Enabled CSV, EDL, OTIO, and SRT deliverable exports via `apiDownload()`, with automatic UTF-8 sanitization and safe fallback filenames.
   - Added integration test coverage in `tests/backend/test_exports_srt.py` for EDL, OTIO, and CSV exports (all 5 tests in suite passing).

2. **Backend Configuration & Model Hardening**:
   - Fixed `apps/api/app/core/config.py`: Cleaned up path construction and eliminated duplicate adjacent string literals in `DATABASE_URL` and `DATABASE_SYNC_URL`.
   - Fixed `apps/api/app/models/user.py`: Added `lazy="selectin"` to `User.role` relationship preventing async greenlet serialization errors during authentication.
   - Fixed `apps/api/main.py`: Cleaned lifespan startup indentation and removed duplicate CORS argument.

3. **Status Ledger Alignment**:
   - Updated `storyboard-system/docs/API_ROUTE_PARITY_MATRIX.md`: Export row reflects verified integration of `edl`, `otio`, `srt`, and `csv`.
   - Updated `storyboard-system/docs/CANONICAL_OWNER_MATRIX.md`: Export capability updated to `INTEGRATED_NOT_CUT_OVER (SRT/EDL/OTIO/CSV)`.
   - Updated `storyboard-system/docs/ACTIVE_WORKSTREAMS.md`: M3 status updated with deliverable exports parity.

## Full Test Suite Results
- `tests/backend` (Pytest): **20/20 passed** in 4.0s.
- `storyboard-system/tests`: **116/116 passed** (3 skipped) in 15.2s.
- `tools/architecture_boundary_gate.py`: **PASS**.
- `npm run check` (storyboard-system): **PASS**.
- `npx tsc --noEmit` (packages/ui): **PASS**.
- `npx tsc --noEmit` (apps/web): **PASS**.

---

# VERTICAL SLICE HARDENING & OWNER DRIFT ELIMINATION — 2026-09-29 16:15 (Session 4)

## Accomplished Milestones
1. **AGENTS.md Distillation into Immutable Constitution**:
   - Slimmed root `AGENTS.md` down to 89 lines focusing strictly on timeless architectural invariants (Canonical Architecture, Single Owner, Safety, Fail-Closed Config, AI/Presence Invariants, Save Semantics, UI Boundaries, Router Boundaries, Legacy Freeze, and Task Tracking Decoupling).
   - Dynamic tracking completely decoupled into `ACTIVE_WORKSTREAMS.md`, `CANONICAL_OWNER_MATRIX.md`, `API_ROUTE_PARITY_MATRIX.md`, and `UI_PRIMITIVE_PARITY.md`.

2. **Packages/UI & Apps/Web Boundary Decoupling**:
   - Decoupled `I18N_DICTIONARY` and `Locale` from `@frameforge/ui` primitive package, establishing `apps/web/lib/i18n.ts` as the application-level i18n owner.
   - Decoupled `@font-face` asset URLs from `packages/ui/src/theme.css` into `apps/web/app/globals.css`, ensuring `@frameforge/ui` is asset-free and consumer-agnostic.

3. **Workspace State Owner Unification (Single Owner Rule)**:
   - Eliminated isolated `useState<Shot | null>` in `apps/web/app/(workspace)/production/[id]/shots/page.tsx` and `timeline/page.tsx`.
   - Unified row selection and Inspector dock/open states across Storyboard, Table, and Timeline into the single authoritative `useWorkspaceStore`.

4. **Domain Contract Integrity & Vertical Slice 01 Hardening**:
   - Cleaned sequence derivation in `StoryboardPage`: eliminated artificial synthetic sequence assignments; unassigned shots cleanly group into "未分场镜头" without fabricating business domain data.
   - Added `ApiError` class in `apps/web/lib/api-client.ts` preserving HTTP status codes, error codes, and conflict details.
   - Upgraded `ShotInspector.tsx` with dirty-state tracking (`isDirty`), save lifecycle states (`idle`, `saving`, `saved`, `conflict`, `error`), non-blocking HTTP 409 conflict alert with server refetching, and in-UI two-step delete confirmation.

5. **Ledger Truth Alignment**:
   - Updated `CANONICAL_OWNER_MATRIX.md` (UI primitive set and i18n layer ownership).
   - Updated `UI_PRIMITIVE_PARITY.md`.

## Verification Results (all GREEN)
- `tests/backend` (Pytest): **20/20 passed** in 4.0s (including `test_production_and_shot_pipeline` covering 409 conflict, reorder, soft delete).
- `storyboard-system/tests`: **116/116 passed** (3 skipped) in 14.6s.
- `tools/architecture_boundary_gate.py`: **PASS**.
- `npm run check` (storyboard-system): **PASS**.
- `npx tsc --noEmit` (packages/ui): **PASS**.
- `npx tsc --noEmit` (apps/web): **PASS**.
