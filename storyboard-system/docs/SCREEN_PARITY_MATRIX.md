# FRAMEFORGE Screen Parity Matrix

This document tracks VNext screen recovery against the accepted FRAMEFORGE product behavior.

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
| /projects | /productions | INTEGRATED_NOT_CUT_OVER | Real API consumer; monogram cover fallback restored. Real cover media and fresh visual QA remain. |
| /projects/[id] entry | /production/[id] | VERIFIED | Route is now a redirect to the selected Shot workspace; unauthorized feature-card overview is no longer the product path. |
| /projects/[id]/shots | /production/[id]/shots | INTEGRATED_NOT_CUT_OVER | Real V-API consumer; selection/Inspector are decoupled, description/VO inline edit is live, modifier multi-select plus method/department/status filtering and sorting are wired to canonical workspace state. Column manager/saved layouts and broader parity remain. |
| /projects/[id]/timeline | /production/[id]/timeline | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline timeline behavior. |
| /projects/[id]/storyboard | /production/[id]/storyboard | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline storyboard/wall behavior. |
| /projects/[id]/deliverables | /production/[id]/deliverables | INTEGRATED_NOT_CUT_OVER | CSV/EDL/OTIO/SRT use real V-API; PDF/Word/layout parity remains incomplete. |
| /projects/[id]/review | /production/[id]/review | INTEGRATED_NOT_CUT_OVER | Persisted comments plus version save/branch/merge/restore and Before–After compare are live. Review decisions render as read-only history; prohibited global approval-dashboard controls are intentionally absent. Word-style audit/inline accept-reject and rendered visual parity remain. |
| /projects/[id]/narration | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/moodboard | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/planning / lighting | N/A | BLOCKED | Baseline scene-planning/lighting capability not yet migrated. |

## Visual gate

The recent mobile screenshot is failure evidence, not a pass baseline. For Shot Workspace, fresh browser inspection is still required for:
- 1440×900
- 1024×768
- 768×1024
- 375×812
- 320×568

Check table horizontal scroll ownership, sticky columns, toolbar density, Inspector overlay, safe-area behavior, conflict states, and focus/keyboard behavior.