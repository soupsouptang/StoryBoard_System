# FRAMEFORGE V-NEXT PRE-CHANGE AUDIT

## 1. Baseline Metadata
- **Date**: 2026-09-16
- **Git Branch**: `master`
- **Git HEAD SHA**: `4986ac0d4af3a4829ba07cd24f95b1c5b1df6aa7`
- **Commit Subject**: `feat(infra): implement Phase 3 Media Compressor, Zero-Residency Nginx Configs, Standalone Launcher, and Deployment Guide`
- **Patch Checkpoint Saved**: `docs/audits/prechange-working-tree.patch`

## 2. Working Tree State
Tracked files with modifications:
- `storyboard-system/README.md`
- `storyboard-system/server.py` (+3653, -137)
- `storyboard-system/static/app.js` (+8781, -2141)
- `storyboard-system/static/index.html` (+1341, -541)
- `storyboard-system/static/styles.css` (+4062, -317)
- `storyboard-system/systemd/storyboard-tunnel.service` (+2, -2)
- `storyboard-system/tests/test_system.py` (+147, -1)

Untracked components present in archive:
- React Workspace Shell: `storyboard-system/src/`, `storyboard-system/packages/ui/`, `storyboard-system/build.mjs`
- Digital Twin / Equipment packs: `film_equipment_25d_pack/`, `film_studio_equipment_ingest_kit_v2/`, `film_studio_equipment_library_standard_v1/`
- Generated artifacts: `static/workspace-v73.js`, `static/workspace-v73.css`
- Deployment & Maintenance tools: `deploy_*.sh`, `deploy_*.py`

## 3. Pre-Flight Verification Results
| Check | Command | Result | Notes |
|---|---|---|---|
| Python Syntax | `python -m py_compile server.py creative_boards.py` | PASS | Both compiled cleanly |
| Python Contract | `python -m unittest tests/test_creative_boards_contract.py` | PASS (7/7) | z-axis contract tests pass |
| JS Static Syntax | `node --check static/*.js` | PASS | `app.js`, `creative-boards.js`, `lighting-scene.js`, `lighting-render.js`, `lighting-assets.js` valid |
| Browser QA Syntax | `node --check tests/lighting_workspace_v8_qa.cjs` | FAIL | SyntaxError: Private field `#loginForm` line 50 + broken selectors |

## 4. Architectural Findings & Constraints
1. **Hybrid Architecture**:
   - React Workspace Shell (`src/workspace/*.tsx` -> `build.mjs` -> `static/workspace-v73.js`)
   - Legacy / DOM Business Layer (`static/app.js`, `static/creative-boards.js`, `static/lighting-*.js`)
   - Direct edits to generated artifacts (`static/workspace-v73.js`, `static/workspace-v73.css`) are strictly prohibited; modify `src/` and run `node build.mjs`.
2. **CSS Cascade Ownership**:
   - Detailed in `docs/audits/CSS_OWNERSHIP.md`. Avoid adding ad-hoc `!important`.
3. **Lighting Persistence Root Cause (P0)**:
   - `static/lighting-scene.js` (Lighting Scene V2.1) uses rich types (`arri_alexa_35`, `dslr`, `furniture`, `pedestal`, `jib`, `slider`, etc.) and attachments (`CF12 Fresnel`).
   - `demoteItem()` in `static/lighting-scene.js` downgrades objects to V1 Creative Board items, causing backend validation rejection `item: invalid object or unknown fields`.
   - Need true versioned Scene persistence (V2 persistence layer) with round-trip contract tests for all presets.
4. **Interactive & UI Bugs**:
   - `renderImportMapping()` missing `escapeHtml()` on initial values.
   - Global search nested double-border / input border.
   - Text selection disabled or trapped after drag/resize.
   - Sidebar settings popover overflowing viewport.
   - Theme toggle icon showing palette instead of sun/moon.
