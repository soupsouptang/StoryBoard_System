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
| Workspace IA: Review | Present | Present | BLOCKED | Review/version/comment surface not yet migrated. |

## 2. Shot Workspace Advanced Capabilities
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Read-first Table | Present | Present | INTEGRATED_NOT_CUT_OVER | Real V-API consumer exists; parity still incomplete. |
| Inline Double-click Editing | Present | Present | INTEGRATED_NOT_CUT_OVER | Description and voice-over cells use real PATCH; broader field coverage and full keyboard/conflict parity remain. |
| Row Single Click | Select | Select | INTEGRATED_NOT_CUT_OVER | Selection no longer implicitly opens Inspector. |
| Row Double Click | Open Inspector | Open Inspector | INTEGRATED_NOT_CUT_OVER | Real consumer exists; broader workspace parity remains. |
| Column Manager | Present | Present | BLOCKED | Resize/reorder/visibility lifecycle not yet migrated. |
| Saved View / Column Layout | Present | Present | BLOCKED | Not yet migrated. |
| Row Height | Present | Present | BLOCKED | Not yet migrated. |
| Search | Present | Present | INTEGRATED_NOT_CUT_OVER | Basic local search exists; parity with baseline search/filter semantics is incomplete. |
| Filtering & Sorting | Present | Present | BLOCKED | Not yet migrated. |
| Grouping | Present | Present | BLOCKED | Not yet migrated. |
| Bulk Actions | Present | Present | BLOCKED | Canonical UI is still missing. V-API bulk writes now use revision-aware atomic `ShotService` semantics and suppress no-op revisions; Panel/custom-field/audit parity remains incomplete. |
| Context Menu | Present | Present | BLOCKED | Not yet migrated. |
| Shot Reorder | Present | Present | BLOCKED | API exists but canonical UI/command parity is incomplete. |
| Undo / Redo | Present | Present | BLOCKED | Not yet migrated. |
| Save Status / Dirty Draft | Present | Present | INTEGRATED_NOT_CUT_OVER | Inspector now tracks changed fields and preserves drafts; browser/visual regression still required. |
| Production Steps | Present | Present | BLOCKED | Not yet migrated. |
| Custom Fields | Present | Present | BLOCKED | Not yet migrated. |
| Comments | Present | Present | BLOCKED | Not yet migrated. |
| Versions | Present | Present | BLOCKED | Not yet migrated. |
| Share | Present | Present | BLOCKED | VNext share contract is not baseline-parity. |
| Shot Trash | Present | Present | INTEGRATED_NOT_CUT_OVER | Soft delete/list/restore/purge route through `ShotService` and lifecycle API coverage exists; actor/audit history and any real retention policy remain incomplete. |

## 3. Server State & Collaboration
| Capability | Baseline | VNext target | Status | Gap / evidence |
| :--- | :--- | :--- | :--- | :--- |
| Strict No-Op Revision | Present | Present | INTEGRATED_NOT_CUT_OVER | `ShotService.patch_shot` suppresses revision changes for no-op writes and has a focused contract test. |
| Shot Command Parity | Present | Present | INTEGRATED_NOT_CUT_OVER | Create/PATCH, trash/restore/purge, and bulk writes now flow through `ShotService`; reorder plus actor/audit/history and full Panel/asset semantics still need convergence. |
| 409 Conflict | Present | Strict | INTEGRATED_NOT_CUT_OVER | API conflict path and draft-preserving UI exist; full end-to-end/browser conflict resolution is not yet cutover-ready. |
| Ephemeral Presence | Active | Authenticated Redis-backed | BLOCKED | Canonical UI consumer must remain disconnected until WS auth + Redis multi-worker semantics are complete. |
| Real-time Sync | Active | Authenticated realtime | BLOCKED | No authoritative cutover yet. |