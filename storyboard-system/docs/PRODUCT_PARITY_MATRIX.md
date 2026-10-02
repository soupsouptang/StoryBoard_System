# FRAMEFORGE Product Parity Matrix

This document tracks VNext product-capability recovery against the functional golden baseline `5e86a0b`.
Current explicit user decisions and later accepted removals override the baseline. As of 2026-10-02, parity means **capability coverage**, not Legacy API/database/runtime compatibility. Old project data is not migrated; the only cross-version compatibility requirement is Legacy portable-project export → VNext mapping/import.

## 2026-10-01 user screenshot baseline addendum

Evidence: [24-image audit and remediation](audits/SCREENSHOT_BASELINE_2026-10-01.md), inspected code `392b74e`. Screenshots establish visible product coverage, not runtime success. This checkpoint takes precedence over older broad coverage claims below. No production writes or deployment are authorized; desktop only, no zoom/narrow-width assessment.

| Capability | Baseline / screenshot evidence | Current gap | Status |
| --- | --- | --- | --- |
| Primary + secondary method grouping | Golden `static/app.js` method groups; S12 | Canonical table groups/filters by primary method; this does not recover independent groups including secondary methods | BLOCKED |
| Production overview | Golden `VIEW.OVERVIEW`; S15 | Existing product statistics require a canonical consumer; not equivalent to an unauthorized feature-card project landing page | BLOCKED |
| Full Inspector / multiple Panels | S05/S07; Golden fields and panels | First Panel media and partial fields do not establish production-step, multi-Panel lifecycle and full photography-field parity | INTEGRATED_NOT_CUT_OVER |
| Real Asset Library | S23 | Current assets page renders a slice of Shots, fixed media metadata and a fixed count; upload lacks handler and category state does not filter the grid | BLOCKED |
| PDF six layouts | Golden index `screenplay` / `us-board`; S01 | All six layout choices, scope and field options require target parity; target PDF remains disabled | BLOCKED |
| Export / project backup coverage | S14 and Golden export links | CSV/EDL/OTIO/SRT slice is insufficient; track VTT/FCPXML/JSON backup/restore plus existing Word/project-PDF contracts separately | INTEGRATED_NOT_CUT_OVER |
| Review three-region composition | S20 | Preserve shot queue, media/diff and comments together; visible revision submission requires explicit service mapping, not generic approval-dashboard restoration | BLOCKED_VISUAL |

The table/card/wall/timeline capabilities and their entry destinations must be preserved. If a historical rule conflicts with the screenshot's entry form, record the exact conflict and equivalent destination rather than silently removing capability. See the screenshot audit for all 24 evidence mappings.

Status vocabulary:
- VERIFIED
- IMPLEMENTED_NOT_INTEGRATED
- INTEGRATED_NOT_CUT_OVER
- CUTOVER_READY
- CUT_OVER
- LEGACY_RETIRED
- BLOCKED
- BLOCKED_VISUAL

## 1. Project Hub & Workspace Navigation
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Project Cover Fallback | Present | Present | INTEGRATED_NOT_CUT_OVER | Monogram + deterministic gradient remains visible in `/productions` when cover media is absent or unavailable. |
| Project Cover Media | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API derives `cover_media_id` from the earliest active Shot's first linked image asset; V-Web Project Hub loads its authenticated image bytes. Synthetic browser QA passed at 1440/1024/768/375/320; durable VNext storage remains; copying Legacy media stores is out of scope. |
| Project Entry | Project list → selected workspace | Same | VERIFIED | `/production/[id]` now redirects to `/production/[id]/shots`; the unauthorized feature-card overview has been removed from the runtime path. |
| Workspace IA: Narration | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Moodboard | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Lighting | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Review | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web Review consumes persisted comments plus immutable version save/list/detail/accept/restore/branch/merge and canonical Before–After compare. Revision-bound decisions are read-only history and global approve/reject/submit dashboard controls are intentionally absent. Word-style audit/inline accept-reject and rendered-browser parity remain incomplete. |

## 2. Shot Workspace Advanced Capabilities
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Read-first Table | Present | Present | INTEGRATED_NOT_CUT_OVER | Real V-API consumer exists; parity still incomplete. |
| Storyboard image frame | Upload/replace and thumbnail | Same | INTEGRATED_NOT_CUT_OVER | V-API now exposes first Panel asset, revision-aware image upload and authenticated bytes; V-Web table/card/wall consume it. Local media storage still needs durable-store and copied-media migration rehearsal before cutover. |
| Panel-frame text | Editable table field | Same | INTEGRATED_NOT_CUT_OVER | `panel_frame` is persisted by Alembic, included in Shot create/PATCH/read, and editable in table/Inspector. |
| Inline Double-click Editing | Present | Present | INTEGRATED_NOT_CUT_OVER | Description and voice-over cells use real PATCH; broader field coverage and full keyboard/conflict parity remain. |
| Row Single Click | Select | Select | INTEGRATED_NOT_CUT_OVER | Selection no longer implicitly opens Inspector. |
| Row Double Click | Open Inspector | Open Inspector | INTEGRATED_NOT_CUT_OVER | Real consumer exists; broader workspace parity remains. |
| Column Manager | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web persists visibility, order, pointer/keyboard widths and row-height locally, and the same normalized layout can now be stored in a server Saved View. Archived/purged custom-field lifecycle remains. |
| Saved View / Column Layout | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API persists shared/private Saved Views with optimistic revision conflicts and no-op suppression; the canonical Shot Table has a shadcn Popover/Dialog consumer for create/apply/overwrite/delete of layout + search/filter/sort/group state. Broader custom-field layout parity and rendered-browser QA remain. |
| Row Height | Present | Present | INTEGRATED_NOT_CUT_OVER | Compact/standard/comfortable/auto row height is wired into the canonical table, persisted locally and included in server Saved Views; rendered-browser QA remains. |
| Search | Present | Present | INTEGRATED_NOT_CUT_OVER | Basic local search exists; parity with baseline search/filter semantics is incomplete. |
| Multi-select | Present | Present | INTEGRATED_NOT_CUT_OVER | Shift-range and Ctrl/Cmd toggle selection now use the canonical workspace selection owner; bulk-action UI parity remains incomplete. |
| Filtering & Sorting | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web consumes search plus method/department/status filters and client sorting; current effective filter/sort/group state is round-tripped through server Saved Views. Advanced baseline filter predicates remain. |
| Grouping | Present | Present | INTEGRATED_NOT_CUT_OVER | Shot Table supports flat, sequence/part and production-method grouping with group headers and rendered-order multi-select semantics; grouping is saved/restored in server Saved Views and disables physical reorder so a grouped presentation cannot corrupt canonical shot order. Fresh rendered desktop/mobile QA remains. |
| Bulk Actions | Present | Present | INTEGRATED_NOT_CUT_OVER | Shot Table mounts the canonical bulk toolbar; method/status/department edits use revision-aware atomic `ShotService` writes and bulk trash uses one project-scoped atomic request. Panel/custom-field/audit parity and fresh rendered visual QA remain incomplete. |
| Context Menu | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical Shot Table now uses shared shadcn/Radix DropdownMenu for row/column actions, keyboard ContextMenu/Shift+F10 entry and focus return. Baseline action coverage and narrow-width rendered QA remain. |
| Shot Reorder | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical table now consumes the full-set revision-aware reorder command through a drag handle plus keyboard ↑/↓ movement. Reorder is intentionally disabled while search/filter/non-default sorting is active so the client cannot submit a partial order. Baseline collaboration lease and rendered desktop/mobile drag parity remain. |
| Undo / Redo | Present | Present | BLOCKED | Not yet migrated. |
| Save Status / Dirty Draft | Present | Present | INTEGRATED_NOT_CUT_OVER | Inspector now tracks changed fields and preserves drafts; browser/visual regression still required. |
| Production Steps | Present | Present | BLOCKED | Not yet migrated. |
| Custom Fields | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-API persists revision-aware create/update, field-type edits, visibility/hide/archive/restore, tombstone-safe purge and revision-checked shot values; the Shot Table renders/edits values and the shadcn field manager creates, edits metadata/type/options/required state, hides, archives, restores and purges. Type changes that would silently rewrite stored Shot value representations are rejected until values are explicitly migrated; rendered browser QA remains. |
| Comments | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API persists create/edit/resolve/reopen/delete with actor audit, quote metadata, role and parent linkage; V-Web Review consumes create/edit/delete/resolve/reopen and limits edit/delete affordances to the current user's own comments. Reply/quote authoring UX and browser/permission parity remain. |
| Versions | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-API/V-Web cover immutable snapshot create/list/detail, accepted-version marking, revision-checked restore, named branch, explicit merge and canonical current-shot Before–After compare. Word-style audit, inline accept/reject and full browser parity remain. |
| Share | Present | Present | BLOCKED | VNext share contract is not baseline-parity. |
| Shot Trash | Present | Present | INTEGRATED_NOT_CUT_OVER | Soft delete/list/restore/purge plus project-scoped bulk trash route through `ShotService`; trash/restore now advance revision and all lifecycle mutations emit audit rows. Retention policy and immutable version-history parity remain incomplete. |

## 3. Server State & Collaboration
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Strict No-Op Revision | Present | Present | INTEGRATED_NOT_CUT_OVER | `ShotService.patch_shot` suppresses revision changes for no-op writes and has a focused contract test. |
| Shot Command Parity | Present | Present | INTEGRATED_NOT_CUT_OVER | Create/PATCH, trash/restore/purge, bulk writes and reorder flow through `ShotService`; real mutations advance authoritative revision where applicable and emit actor-scoped `AuditLog` rows. Version restore/merge route back through the same command boundary. Panel/asset/custom-field snapshot parity remains. |
| 409 Conflict | Present | Strict | INTEGRATED_NOT_CUT_OVER | API conflict path and draft-preserving UI exist; full end-to-end/browser conflict resolution is not yet cutover-ready. |
| Ephemeral Presence | Active | Authenticated Redis-backed | BLOCKED | Canonical UI consumer must remain disconnected until WS auth + Redis multi-worker semantics are complete. |
| Real-time Sync | Active | Authenticated realtime | BLOCKED | No authoritative cutover yet. |
