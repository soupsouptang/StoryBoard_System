# Canvas / Moodboard / Lighting Migration Audit

Audit date: 2026-09-30  
Repository baseline: bf69345  
Scope: read-only inventory of the Legacy Moodboard and Lighting runtime, persistence contract, UI hierarchy, touch lifecycle, and VNext integration gap. No product code or data was changed.

## Decision

Moodboard and Lighting still run through the Legacy static application. The canonical target architecture is VNext (apps/web + apps/api + repository-root packages/ui), but this checkout has no VNext Board route, API endpoint, SQLAlchemy model, or migration. CANONICAL_OWNER_MATRIX.md also has no Board/Moodboard/Lighting row; add that owner record during the next matrix update.

Keep the current Legacy path as the only writer until VNext can load and save both board kinds under an equivalent revision contract. Do not run the Legacy and VNext editors as concurrent writers or copy data into a second store during a partial UI migration. This is a Phase 4 cutover: preserve the existing hierarchy and behaviors, use the shadcn new-york primitives for presentation, and keep Moodboard and Lighting as separate domain adapters.

## Current owner inventory

| Responsibility | Current runtime owner | Evidence / boundary |
| --- | --- | --- |
| Real feature entry | storyboard-system/static/app.js | Sidebar entries moodboard and lighting select VIEW.MOODBOARD / VIEW.LIGHTING; renderCurrentView() calls renderCreativeBoards(view). |
| Mount / navigation integration | FrameForgeBoards.mount() in static/creative-boards.js, called by renderCreativeBoards() | Receives project ID, current shots/assets, API wrapper, image upload callback, and shot-navigation callback. Before changing views, navigateToView() awaits flushCreativeBoards(). Project changes and dashboard navigation call the returned cleanup. |
| Board session / UI state | createSession() and mounted feature closure in static/creative-boards.js | One in-memory session per project; owns board draft, revision, dirty/pending/conflict state, history/future, gesture count, and per-kind view state (board, selection, zoom, snap, mode, orbit). Camera/zoom/tool state is view state, not an independent server write. |
| Moodboard data projection | static/creative-boards.js | V1 note/color/link/image items are edited directly. Serializer emits Moodboard V1 fields accepted by the server. |
| Lighting V1/V2 mapping | static/lighting-scene.js and creative-boards.js hydration/serializer | normalizeScene, migrateItem, and demoteItem bridge stored V2 objects and the editor's V1-shaped items. Save rebuilds V2 objects from the current edited items and includes compatibility items. This is an existing compatibility boundary; neither representation can be dropped without round-trip proof. |
| 2D navigation | static/creative-board-navigation.js | Owns 2D viewport wheel/pan/pinch listeners and releases captures/listeners through its returned disposer. WebGL targets are excluded from 2D touch handling. |
| 2D item gestures / editor panels | static/creative-boards.js and static/creative-boards.css | Owns item selection, drag, rotate/resize handles, snap, keyboard actions, panel layout, and board-specific toolbar/inspector/library rendering. |
| WebGL scene and GLB runtime | static/lighting-render.js | reconcileWebGLRuntime() owns reuse/recreate for one board/viewport; LightingWebGLRuntime owns scene, renderer, resize observer, pointer handlers, GLB cache/in-flight loads, and camera. creative-boards.js selects mode and calls reconcile. |
| Asset catalogue / models | static/lighting-assets.js and static/assets/glb/** | Supplies equipment metadata and GLB URLs. Preserve catalogue, media and license files; do not duplicate or prune them by filename. |
| Stored board aggregate | storyboard-system/creative_boards.py | The configured Legacy HTTP owner is storyboard-system/server.py; it stores a project-scoped JSON document and revision in SQLite project_creative_boards. The helper uses a savepoint; the route owns auth/CSRF, transaction and HTTP status mapping. |
| Target UI / API | Not implemented for boards in this checkout | apps/web has no Moodboard/Lighting route/component; apps/api has no matching board route, schema/model, service, or Alembic migration. Existing unrelated VNext files do not constitute an integrated owner. |

### Load, save, navigation and exit paths

Legacy project bundle + sidebar selection  
→ static/app.js::renderCreativeBoards(kind)  
→ FrameForgeBoards.mount(container, {projectId, shots, assets, api, upload, onShot})  
→ session.load(GET /api/projects/{pid}/creative-boards)  
→ hydrate Lighting V2 objects into editor items as needed

Edit  
→ session.change / record (history, dirty version)  
→ 700 ms debounce or explicit Ctrl/Cmd+S / Retry  
→ kind-specific serializer  
→ PUT {revision, boards}  
→ server validates project references and performs revision compare-and-swap  
→ acknowledged revision updates saved state

Leaving a board view awaits flush(). A failed flush offers draft export and an explicit leave decision. Explicit reload retains the old in-memory draft for export. Component cleanup is idempotent and disposes listeners/runtime; if still dirty, its internal final flush is best effort. The page-level navigation guard is the normal awaited save path and must remain in the real route integration.

## Persistence contract to preserve

The active endpoint is authenticated GET and PUT /api/projects/{pid}/creative-boards. Both return {revision, boards}; PUT accepts {revision, boards}. Project authorization and CSRF are enforced by the parent server.py route. The helper uses optimistic compare-and-swap; stale writes return 409 with the current document. Validation errors map to 400, missing projects to 404. A successful write advances revision exactly once. A project may contain at most 50 boards and 500 total items.

### Moodboard V1

- Board fields: id, kind=moodboard, name, width, height, shot_ids, items.
- Item types are note, color, link, image, with stable item ID, position, dimensions, rotation and label. Type-specific content is note text/color, color, HTTP(S) URL, or project-owned asset_id.
- Shot IDs and image asset IDs must belong to the same project. Image URLs are not persisted in place of asset references. Spatial z is not a Moodboard field. Unknown or type-inapplicable keys are rejected.
- Current image flow uploads through the existing project media endpoint with category Moodboard, adds the returned asset to the project bundle, and stores its ID in the board item.

### Lighting V2 and compatibility projection

- Board fields include V1 identity/layout fields plus schemaVersion=2, version=2, settings, environment, and objects (or accepted nested scene compatibility input).
- V2 objects carry identity/type/subtype/name/label, 3-axis position/rotation/scale, visibility/lock, metadata/properties and optional project-owned asset reference.
- Settings include unit, grid size, snap/grid visibility and default view. Environment includes room width/depth and optional wall height. The active editor also uses V1-shaped items for placement and inspector controls; lighting-scene.js maps between these shapes. The server accepts V2 plus a compatibility items projection. Preserve transform axes, units, subtype/property fields, IDs, shot links and asset references through both directions.
- 2D board pan/zoom, camera orbit, selection and current tool are editor state. Do not silently promote transient view state into persistent domain fields.

These contracts are defined in creative_boards.py and covered by creative-board and Lighting V2 tests. The future API must reproduce validation, scope, status, conflict and round-trip semantics before the old endpoint can lose its last consumer.

## Existing product hierarchy and behavior

Keep the current two top-level feature entries and their board-specific workspace hierarchy: board chooser and toolbar; left project-image/equipment library; central canvas/stage; selected-item or board inspector; and overflow menu for create, rename, duplicate, delete, retry, reload and draft export. Keep current Chinese labels, status/error wording, and the distinction between Moodboard and Lighting. Rebuild surfaces with the VNext shell and shadcn primitives; do not replace these pages with a generic gallery or simplified canvas.

Preserve behavior already implemented in creative-boards.js, lighting-scene.js and lighting-render.js:

- Both: multiple project-scoped boards; create/rename/duplicate/delete with undo; per-item selection and inspector editing; drag/move/rotate/resize; snap; zoom, fit and pan; undo/redo; keyboard shortcuts; dirty/saving/saved/error/conflict feedback; retry/reload; draft export/recovery; shot association/navigation; autosave and awaited leave protection.
- Moodboard: note, color, link and project-image cards; image upload/reference; text and card clipping; searchable project-image library; freeform 2D composition.
- Lighting: equipment catalogue/search and presets; plan placement/editing; 2D top plan, 3D perspective and split plan/3D modes; top/bird/walk/3-quarter camera presets; select/move/rotate/orbit/pan/focus tools; elevation and type-specific light/camera/actor properties; coverage display; real GLB with procedural fallback.
- Touch: 2D/Moodboard two-finger zoom around its midpoint with midpoint pan; 3D two-finger camera zoom/pan; 44 CSS-pixel rotate/resize hit targets at zoom; pointer capture and cancellation. Browser-simulated touch coverage exists in canvas_interaction_qa.cjs; physical-device behavior still requires device/browser acceptance.

The visual authority is docs/SHADCN_UI_BASELINE.md (shadcn/ui new-york, neutral semantic palette). Functional behavior comes from the current product implementation and approved functional baseline; Legacy CSS effects are not the VNext visual target. Preserve panel order, available controls, action semantics, information density, labels and save feedback while replacing presentation primitives.

## Minimal real integration sequence

1. **Freeze evidence and fixtures.** Preserve representative Moodboard V1, Lighting V1 and Lighting V2 documents, including mixed boards, shot links, image/GLB-backed items, optional properties, empty boards and non-default transforms. Record serialized round-trips; identify any field the current normalizers intentionally reject or omit before writing a VNext migration.
2. **Add one canonical Board service in apps/api.** Define Board and item DTOs from observed contracts, scoped to a production/project. Add SQLAlchemy persistence and revision CAS in the configured canonical database. Implement GET/PUT (or equivalent read/write operations) with the same authorization, project reference checks, limits, validation/error mapping and one-revision-per-success rule. Do not dual-write to Legacy SQLite. Any database transfer must be an explicit, separately reviewed migration with backup, reconciliation and rollback evidence.
3. **Add VNext Board feature routes and adapters.** Add actual Moodboard and Lighting entries/pages to apps/web and mount them in the existing production workspace shell. Keep separate kind serializers/adapters over the canonical Board service. Use root packages/ui shadcn primitives for toolbar controls, fields, menus, dialogs and panels; keep the existing hierarchy and Chinese copy. Route image upload through the canonical project asset service and retain asset IDs. Connect shot selection/navigation to the existing VNext workspace store without making the board a second owner of global selection.
4. **Give the VNext editor one lifecycle owner.** Mount one editor session per active board kind; keep domain draft/revision/save state separate from local view/camera state. Own 2D navigation listeners and 3D renderer/ResizeObserver/pointer captures/GLB async completions in component effects or a dedicated editor runtime; cleanup must cancel scheduled frames, disconnect observers, release captures and ignore late loads on mode change, route change and unmount. Reuse current proven gestures/rendering behaviors rather than changing semantics.
5. **Verify the actual entry before cutover.** Run contract tests for both formats, round-trip and conflict tests, asset/shot scope tests, and browser tests through the real VNext login → production → board route. Exercise create/edit/upload/save/reload, dirty leave, 409 and recovery, all three Lighting modes, mode/route teardown, touch gestures, keyboard operations and desktop/narrow layouts. Confirm network calls target VNext and the server acknowledges the new revision. Update the owner matrix with evidence and an explicit rollback path.
6. **Retire Legacy only after the gate.** Switch real navigation and read/write traffic together after VNext parity and rollback rehearsal. Confirm zero remaining callers of FrameForgeBoards, the Legacy endpoint and associated styles/scripts. Only then remove old mount, serializers/renderers/listeners/API/table migration code with no consumers. Keep the current endpoint available for rollback until the agreed rollback window expires; never leave two active writers.

## Evidence and limits

Read-only sources inspected: storyboard-system/AGENTS.md; docs/ARCHITECTURE.md; docs/ARCHITECTURE_MIGRATION.md; docs/LIFECYCLE_ARCHITECTURE_PLAN.md; docs/CANONICAL_OWNER_MATRIX.md; docs/SHADCN_UI_BASELINE.md; docs/FRAMEFORGE_COMPONENT_LIBRARY_CODEX_MASTER.md; listed Legacy frontend/backend files; VNext apps/web, apps/api, and root packages/ui file inventories; and the listed test entry points.

Relevant existing tests include creative_boards_qa.cjs, canvas_interaction_qa.cjs, moodboard_browser_qa.cjs, lighting_scene_v2_contract_qa.cjs, lighting_render_qa.cjs, lighting_workspace_v8_qa.cjs, test_creative_boards_contract.py, test_lighting_scene_v2_contract.py, test_backend_integrity.py, and test_asset_cleanup_contract.py. They were inventoried, not executed for this documentation-only task.

The repository baseline is bf69345. At audit start, apps/web/components/shot/InlineEditCell.tsx was the only dirty path; before this audit finished, NavRail.tsx, TopBar.tsx, ShotColumnManager.tsx, ShotTableContextMenu.tsx and useReview.ts were also dirty. These paths were outside this audit and were not touched. No production environment, service, credentials, private network address, or customer dataset was accessed. No application source, tests, schema, generated output or runtime data were modified by this audit.
