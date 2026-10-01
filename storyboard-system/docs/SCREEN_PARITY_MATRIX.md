# FRAMEFORGE Screen Parity Matrix

This document tracks VNext screen recovery against the accepted FRAMEFORGE product behavior.

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
| /projects | /productions | INTEGRATED_NOT_CUT_OVER | Authenticated cover media and monogram fallback render in synthetic browser QA at 1440/1024/768/375/320; 320 dark/light checked. Copied media and representative visual QA remain. |
| /projects/[id] entry | /production/[id] | VERIFIED | Route is now a redirect to the selected Shot workspace; unauthorized feature-card overview is no longer the product path. |
| /projects/[id]/shots | /production/[id]/shots | BLOCKED_VISUAL | Real V-API consumer; selection/Inspector are decoupled, inline/custom-field editing, column manager, saved layouts, filtering, sorting and grouping are live. The visible primary `新建镜头` entry regressed during the page rewrite and has now been restored through the real `NewShotModal`. Desktop 1440 still fails the accepted shadcn/new-york hierarchy, density, truncation and right-side organization, so this screen is not visually accepted. |
| /projects/[id]/timeline | /production/[id]/timeline | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline timeline behavior. |
| /projects/[id]/storyboard | /production/[id]/storyboard | IMPLEMENTED_NOT_INTEGRATED | V-Web implementation exists but remains below baseline storyboard/wall behavior. |
| /projects/[id]/deliverables | /production/[id]/deliverables | INTEGRATED_NOT_CUT_OVER | CSV/EDL/OTIO/SRT use real V-API; PDF/Word/layout parity remains incomplete. |
| /projects/[id]/review | /production/[id]/review | BLOCKED_VISUAL | Persisted comments, reply/quote authoring, version operations and Before–After compare have consumers. The consumer now restores the queue / real Panel image / comments-and-versions regions, stable Shot-ID selection and the version snapshot submission entry. Synthetic component checks cover selection after reorder, real media references, snapshot dispatch, readonly access and failure retention; fresh desktop acceptance remains pending. Word-style per-change accept/reject still needs contract and UI parity. Do not equate whole-version accept, per-change audit and historical approval statuses, or restore approval workflows from the old baseline automatically. |
| /projects/[id]/narration | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/moodboard | N/A | BLOCKED | Baseline capability not yet migrated to canonical V-Web. |
| /projects/[id]/planning / lighting | N/A | BLOCKED | Baseline scene-planning/lighting capability not yet migrated. |

## Visual gate

Current gate is **desktop-first**. The active required rendered evidence is **1440×900** for Shell / Project Hub, Shot Table, Inspector and Review. Current status is `BLOCKED_VISUAL / FAIL`.

Do not test or use 1024×768, 768×1024, 375×812 or 320×568 as an acceptance requirement until those four desktop core surfaces pass. Those sizes remain deferred work, not cancelled scope.

At 1440, check information hierarchy, table scroll/sticky ownership, toolbar density, text truncation, Inspector width/open lifecycle, Review decision affordances, conflict states and focus/keyboard behavior. A shadcn import, successful build or absence of document-level horizontal scroll does not promote a screen to visual PASS.
