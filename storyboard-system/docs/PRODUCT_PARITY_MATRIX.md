# FRAMEFORGE Product Parity Matrix

This document tracks VNext recovery against the functional golden baseline `5e86a0b`.
Current explicit user decisions and later accepted removals override the baseline.

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
| Project Cover Fallback | Present | Present | INTEGRATED_NOT_CUT_OVER | Monogram + deterministic gradient is consumed by `/productions`; real media hydration is not yet available in V-API. |
| Project Cover Media | Present | Present | IMPLEMENTED_NOT_INTEGRATED | V-API now derives `cover_media_id` from the earliest active Shot's first linked image asset, matching the Legacy read-model rule. Canonical media-byte resolver and real V-Web image consumption are still missing. |
| Project Entry | Project list → selected workspace | Same | VERIFIED | `/production/[id]` now redirects to `/production/[id]/shots`; the unauthorized feature-card overview has been removed from the runtime path. |
| Workspace IA: Narration | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Moodboard | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Lighting | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Review | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web Review consumes persistent comments, revision-aware review decisions, immutable Shot versions, accept/restore plus named branch/merge actions. Compare UI, richer snapshot scope and rendered-browser parity remain incomplete. |

## 2. Shot Workspace Advanced Capabilities
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Read-first Table | Present | Present | INTEGRATED_NOT_CUT_OVER | Real V-API consumer exists; parity still incomplete. |
| Inline Double-click Editing | Present | Present | INTEGRATED_NOT_CUT_OVER | Description and voice-over cells use real PATCH; broader field coverage and full keyboard/conflict parity remain. |
| Row Single Click | Select | Select | INTEGRATED_NOT_CUT_OVER | Selection no longer implicitly opens Inspector. |
| Row Double Click | Open Inspector | Open Inspector | INTEGRATED_NOT_CUT_OVER | Real consumer exists; broader workspace parity remains. |
| Column Manager | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web now persists visibility, order, pointer/keyboard column widths and row-height preferences per production/browser. Server-saved layouts plus archived/purged custom-field lifecycle remain. |
| Saved View / Column Layout | Present | Present | BLOCKED | Not yet migrated. |
| Row Height | Present | Present | INTEGRATED_NOT_CUT_OVER | Compact/standard/comfortable/auto row-height controls are wired into the canonical table and persisted locally; server saved-view parity and rendered-browser QA remain. |
| Search | Present | Present | INTEGRATED_NOT_CUT_OVER | Basic local search exists; parity with baseline search/filter semantics is incomplete. |
| Multi-select | Present | Present | INTEGRATED_NOT_CUT_OVER | Shift-range and Ctrl/Cmd toggle selection now use the canonical workspace selection owner; bulk-action UI parity remains incomplete. |
| Filtering & Sorting | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web now consumes workspace search plus method/department/status filters and client sorting; advanced baseline filter semantics and persisted saved views remain. |
| Grouping | Present | Present | BLOCKED | Not yet migrated. |
| Bulk Actions | Present | Present | INTEGRATED_NOT_CUT_OVER | Shot Table mounts the canonical bulk toolbar; method/status/department edits use revision-aware atomic `ShotService` writes and bulk trash uses one project-scoped atomic request. Panel/custom-field/audit parity and fresh rendered visual QA remain incomplete. |
| Context Menu | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical Shot Table now uses shared shadcn/Radix DropdownMenu for row/column actions, keyboard ContextMenu/Shift+F10 entry and focus return. Baseline action coverage and narrow-width rendered QA remain. |
| Shot Reorder | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical table now consumes the full-set revision-aware reorder command through a drag handle plus keyboard ↑/↓ movement. Reorder is intentionally disabled while search/filter/non-default sorting is active so the client cannot submit a partial order. Baseline collaboration lease and rendered desktop/mobile drag parity remain. |
| Undo / Redo | Present | Present | BLOCKED | Not yet migrated. |
| Save Status / Dirty Draft | Present | Present | INTEGRATED_NOT_CUT_OVER | Inspector now tracks changed fields and preserves drafts; browser/visual regression still required. |
| Production Steps | Present | Present | BLOCKED | Not yet migrated. |
| Custom Fields | Present | Present | BLOCKED | Not yet migrated. |
| Comments | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API now persists create/edit/resolve/reopen/delete semantics with actor audit, quote metadata, role and parent linkage; V-Web Review consumes real comments instead of local fake state. Browser/permission parity remains. |
| Versions | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API now provides immutable per-shot versions with serialized version numbering, accept, revision-checked restore, named branches and explicit merge-with-backup semantics; Review consumes create/select/accept/restore/branch/merge. Compare UI and Panel/asset/custom-field snapshot parity remain. |
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