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
| Project Cover Media | Present | Present | BLOCKED | V-API does not yet expose `cover_media_id` plus a canonical media-byte resolver. |
| Project Entry | Project list → selected workspace | Same | VERIFIED | `/production/[id]` now redirects to `/production/[id]/shots`; the unauthorized feature-card overview has been removed from the runtime path. |
| Workspace IA: Narration | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Moodboard | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Lighting | Present | Present | BLOCKED | Missing from canonical V-Web workspace. |
| Workspace IA: Review | Present | Present | INTEGRATED_NOT_CUT_OVER | Canonical V-Web consumes persisted review comments and read-only revision-bound history. Global approve/reject/submit dashboard controls are intentionally absent per current product rules. Version/compare/Word-style audit/inline diff parity and fresh visual QA remain. |

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
| Shot Reorder | Present | Present | IMPLEMENTED_NOT_INTEGRATED | Canonical command now requires one production, the complete active-shot set, exact client `base_order`, and per-shot revisions before any mutation; V-Web hook sends that contract. Canonical drag/reorder UI plus baseline collaboration lease, snapshot/audit and browser parity are still missing. |
| Undo / Redo | Present | Present | BLOCKED | Not yet migrated. |
| Save Status / Dirty Draft | Present | Present | INTEGRATED_NOT_CUT_OVER | Inspector now tracks changed fields and preserves drafts; browser/visual regression still required. |
| Production Steps | Present | Present | BLOCKED | Not yet migrated. |
| Custom Fields | Present | Present | BLOCKED | Not yet migrated. |
| Comments | Present | Present | INTEGRATED_NOT_CUT_OVER | V-API now persists create/edit/resolve/reopen/delete semantics with actor audit, quote metadata, role and parent linkage; V-Web Review consumes real comments instead of local fake state. Browser/permission parity remains. |
| Versions | Present | Present | BLOCKED | Not yet migrated. |
| Share | Present | Present | BLOCKED | VNext share contract is not baseline-parity. |
| Shot Trash | Present | Present | INTEGRATED_NOT_CUT_OVER | Soft delete/list/restore/purge plus project-scoped bulk trash route through `ShotService`; trash/restore now advance revision and all lifecycle mutations emit audit rows. Retention policy and immutable version-history parity remain incomplete. |

## 3. Server State & Collaboration
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Strict No-Op Revision | Present | Present | INTEGRATED_NOT_CUT_OVER | `ShotService.patch_shot` suppresses revision changes for no-op writes and has a focused contract test. |
| Shot Command Parity | Present | Present | INTEGRATED_NOT_CUT_OVER | Create/PATCH, trash/restore/purge, bulk writes and reorder flow through `ShotService`; real mutations now advance authoritative revision where applicable and emit `AuditLog` rows with actor/action metadata. Immutable ShotVersion/history plus full Panel/asset/custom-field semantics still need convergence. |
| 409 Conflict | Present | Strict | INTEGRATED_NOT_CUT_OVER | API conflict path and draft-preserving UI exist; full end-to-end/browser conflict resolution is not yet cutover-ready. |
| Ephemeral Presence | Active | Authenticated Redis-backed | BLOCKED | Canonical UI consumer must remain disconnected until WS auth + Redis multi-worker semantics are complete. |
| Real-time Sync | Active | Authenticated realtime | BLOCKED | No authoritative cutover yet. |