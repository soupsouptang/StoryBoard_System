# FRAMEFORGE shadcn/ui Visual Baseline

> Status: **ACTIVE VISUAL BASELINE**
>
> Visual baseline: **shadcn/ui `new-york` + neutral semantic palette**
>
> Functional baseline: **`5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`**
>
> Canonical shared UI owner: **repo-root `packages/ui`**
>
> This document defines the minimum visual contract for VNext. It does not add product features.

---

## 0. User correction: reconstruct the accepted product, not a new UI

The 2026-09-30 user correction takes precedence: the current UI has missing functionality and an oversimplified design that drifted from the agreed plan, appearance and copy. shadcn is the implementation foundation, not permission to invent replacement screens or discard the accepted visual hierarchy.

Preserve the original product's capabilities, wording, typography, media emphasis, spatial relationships and accepted interactions while replacing primitives. Do not treat a neutral palette, component import, successful build or cleaner screenshot as feature parity. Every module needs an explicit capability/entry/copy/layout/consumer gap inventory. Follow section 0.1 of `FRAMEFORGE_COMPONENT_LIBRARY_CODEX_MASTER.md` for the full audit and retirement contract.

The user's current small-slice workflow skips tests before immediate upload. Record untested work honestly; upload/merge does not promote visual acceptance or cutover. Existing automation is not disabled by that instruction.

## 1. Two baselines, two different jobs

FRAMEFORGE intentionally uses two independent baselines:

### Functional baseline — `5e86a0b`

Use it to answer:

- Which screens/capabilities existed?
- What information was visible?
- What did click/double-click/right-click/drag do?
- What was selected vs inspected?
- What data was editable?
- What Review/Version/Comment behavior existed?
- What table, column, import, export and collaboration behavior must survive?

Do **not** copy its DOM, CSS cascade, custom radius system, glass effects, animated sheen, overlay styling, or historical component implementation.

### Visual baseline — shadcn/ui

Use shadcn `new-york` to decide:

- primitive geometry;
- radius;
- form-control proportions;
- Card hierarchy;
- Dialog/Popover/DropdownMenu behavior;
- neutral surface layering;
- focus-visible treatment;
- keyboard/accessibility behavior;
- spacing rhythm.

**Rule:**

```text
5e86a0b decides WHAT survives.
shadcn decides HOW the new UI is presented.
```

A visually cleaner migration is never permission to remove baseline functionality.

---

## 2. What was recovered from the normal product version

The accepted product baseline proves several useful **information-architecture** proportions even though its visual CSS is not canonical.

| Area | Product proportion to preserve | VNext shadcn baseline |
| --- | --- | --- |
| Global top bar | compact persistent header | `50px` / `--ff-shell-topbar-h` |
| Desktop navigation | real workspace IA, not a dashboard replacement | expanded `224px`, collapsed `64px` |
| Mobile workspace navigation | horizontal rail | `56px` |
| Navigation rows | compact but readable | `36px`, `rounded-md`, no decorative shadow |
| Inspector | explicit detail surface, separate from row selection | `380px` desktop target |
| Project Hub | read-first project list with compact cover + metadata | max content width `1152px` |
| Shot Table | read-first dense production table | weak separators, sticky header, no boxed-cell visual noise |
| Overlays | modal/menu/popover as temporary interaction surfaces | shared Radix/shadcn primitives only |
| Review | comments/version/diff information density | shadcn cards/sections; behavior comes from functional baseline |

The Legacy version also confirms that professional density comes from hierarchy and data visibility, **not from making every control smaller**.

---

## 2026-10-01 explicit standards update

The active user requests official latest Tailwind 4 and New York default h9. This supersedes historical Tailwind 3 / 40px control guidance. The root package now adopts the official New York v4 neutral OKLCH theme, 0.625rem radius, default 36px controls, 32px small and 40px large Button variants. Shell dimensions and functional/layout relationships remain unchanged. Fonts remain the approved Satoshi/Sarasa stack; bundled font weights are documented in `packages/ui/README.md`. Select empty-domain and controlled Dialog focus adapters preserve existing consumers. Package checks, Web typecheck and build pass; rendered acceptance remains BLOCKED_VISUAL.

Sources: [Tailwind PostCSS installation](https://tailwindcss.com/docs/installation/using-postcss), [shadcn Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4), [official New York v4 registry](https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui).

## 3. Canonical theme tokens

The implementation owner is:

```text
packages/ui/src/theme.css
```

Current baseline tokens include:

```text
--radius: 0.625rem

--ff-shell-topbar-h: 3.125rem
--ff-shell-mobile-nav-h: 3.5rem
--ff-shell-nav-expanded-w: 14rem
--ff-shell-nav-collapsed-w: 4rem
--ff-inspector-w: 23.75rem
--ff-page-max-w: 72rem

--ff-content-pad: 1rem
--ff-content-pad-lg: 2rem
--ff-panel-gap: 1rem

--ff-motion-fast: 120ms
--ff-motion-normal: 180ms
```

These are shared layout constraints. They must not become a second component system.

---

## 4. Color baseline

FRAMEFORGE VNext uses a neutral shadcn semantic palette.

### Allowed

- `background`
- `foreground`
- `card`
- `popover`
- `muted`
- `accent`
- `border`
- `input`
- `ring`
- `primary`
- `destructive`
- `warning`

### Rules

- Primary is neutral, not a permanent blue/amber/gold brand wash.
- Blue or other chroma may appear only where a specific domain/status meaning requires it.
- Amber/gold is not a global navigation, button, selection, border or card color.
- Warning color is reserved for warning semantics.
- Destructive color is reserved for destructive/error semantics.
- Selection should usually be `accent` + clear text/ring, not a saturated fill.
- Dark and light themes must preserve hierarchy rather than merely invert colors.

Do not introduce page-local palettes when semantic tokens already express the state.

---

## 5. Primitive baseline

Canonical owner:

```text
packages/ui
```

### Button

Follow the shared shadcn variants:

- default
- secondary
- outline
- ghost
- destructive
- link

Baseline sizing:

- default: `h-9`
- small: `h-8`
- large: `h-10`
- icon: `size-9`

Feature pages may use an explicit smaller icon hit target only when the surrounding interaction already supplies adequate target size, such as a table utility control.

Do not globally shrink Button just to make the application appear “professional”.

### Input / TextArea / Select

- default Input / Select height: `h-9`; Textarea uses `min-h-16`;
- `rounded-md`;
- one semantic input border;
- one focus-visible ring;
- no extra blue outline layer;
- placeholder uses muted foreground;
- disabled state is visible but not decorative.

### Card

Use the shared Card geometry:

- `rounded-xl`;
- one subtle border;
- `shadow-sm` only where Card elevation is useful;
- official v4 `flex flex-col gap-6 py-6`, with `px-6` header/content/footer; existing row/media compositions explicitly keep their layout.

A feature may use tighter internal padding where the product density requires it, but must not redefine Card radius or introduce a different card family.

### Dialog / Popover / DropdownMenu

Must come from `@frameforge/ui`.

Do not implement feature-local fixed overlays when an existing primitive covers the interaction.

Required behavior:

- portal;
- collision handling where relevant;
- Escape;
- outside interaction;
- focus trap for Dialog;
- focus return;
- keyboard navigation;
- correct z-index;
- no invisible overlay remaining after close.

---

## 6. Shell baseline

### TopBar

Canonical consumer:

```text
apps/web/components/app-shell/TopBar.tsx
```

Rules:

- height comes from `--ff-shell-topbar-h`;
- neutral background;
- single bottom border;
- no heavy card shadow;
- brand mark is a small neutral surface, not a decorative logo card;
- locale/theme/account actions use shared Button;
- production context is a breadcrumb/context label, not a second toolbar.

### NavRail

Canonical consumer:

```text
apps/web/components/app-shell/NavRail.tsx
```

Rules:

- desktop expanded width: `224px`;
- collapsed width: `64px`;
- mobile height: `56px`;
- row height: `36px`;
- `rounded-md`;
- active state uses accent surface;
- no active-item drop shadow;
- no permanent saturated color;
- collapse animation changes width only; do not use global `transition-all`.

### Project Hub

Project Hub must reuse the shared TopBar rather than maintaining a second visual header.

Baseline layout:

- max content width: `1152px`;
- project rows remain compact read-first cards;
- cover, project title, production metadata, status/code and entry affordance remain visually ordered;
- one primary CTA for project creation.

---

## 7. Workspace content hierarchy

Default vertical hierarchy:

```text
TopBar
└─ Workspace frame
   ├─ NavRail
   └─ Feature content
      ├─ page/feature header
      ├─ local toolbar/filter controls
      └─ primary working surface
```

Do not add additional global-looking bars inside a feature page.

A page should normally have only one strongest primary action.

Secondary utilities should use outline/ghost variants.

---

## 8. Shot Table baseline

The Shot Table is a **read-first production surface**, not a grid of input boxes.

Rules:

- cells are visually quiet until editing;
- sticky header remains subtle;
- row separators use semantic border;
- avoid permanent borders around every value;
- selection and focus are distinct;
- row click selects;
- row double-click may inspect where the functional baseline requires it;
- Inspector does not auto-open simply because selection changed;
- inline editing should use the same shared input semantics;
- context menus use shared DropdownMenu;
- column controls use shared Popover;
- no saturated selection wash;
- width/row-height/column order behavior must not be lost for visual cleanup.

Table density may be compact, but action buttons and inputs keep shadcn control geometry unless the interaction explicitly needs a table-sized utility target.

---

## 9. Inspector baseline

Inspector is a detail editor, not a modal card.

Desktop target:

```text
width: var(--ff-inspector-w) = 380px
```

Rules:

- separate from selection state;
- explicit open/close lifecycle;
- one vertical boundary from working surface;
- avoid an extra floating black frame around the Inspector;
- use semantic section separators rather than nested card stacks;
- dirty/saving/conflict states stay functional and visible;
- mobile may become an overlay/drawer-like surface, but must retain the same data contract.

---

## 10. Review baseline

Functional behavior is recovered from `5e86a0b`; visual implementation is new shadcn.

Keep:

- comments;
- comment resolution lifecycle;
- immutable versions;
- Before / After comparison;
- revision-aware decisions where still accepted by current product requirements;
- restore/branch/merge where current parity documents retain them;
- Word-like diff readability.

Visual rules:

- cards/sections use shared shadcn geometry;
- diff uses semantic destructive/accent treatment;
- do not reproduce Legacy glass panels, 16px overlay family or animated sheen;
- version selection must be visually explicit;
- mutation actions that replace current data require confirmation.

---

## 11. Motion baseline

Motion communicates state only.

Allowed examples:

- menu/popover open/close;
- sidebar width change;
- Inspector entrance/exit;
- save status;
- loading/success/error;
- drag/reorder feedback.

Rules:

- no global `transition: all`;
- default interaction timing should use `120–180ms`;
- larger panel/view changes may be modestly longer only with evidence;
- no decorative infinite sheen on primary buttons;
- no motion may retain pointer-active invisible layers;
- honor `prefers-reduced-motion`.

---

## 12. What must NOT be copied from Legacy visual CSS

The following are historical visual evidence only:

- custom `ffui-*` radius hierarchy;
- 16px glass overlay family;
- animated primary-button sheen;
- project-wide bespoke shadows;
- hover lift applied to every card;
- old global CSS cascade;
- duplicated static/workspace component styling;
- old blue/amber/gold selection systems;
- page-local copies of modal/popover/menu behavior.

If a Legacy screen looks better because of hierarchy or information density, reproduce the **hierarchy**, not the CSS implementation.

---

## 13. Removed product concepts remain removed

A shadcn component existing is not a reason to restore a removed feature.

Do not restore:

- Compact / Professional mode;
- old mode toggle;
- removed view switch;
- generic AI chat/sidebar;
- meetings;
- chat;
- membership/VIP UI;
- generic OA dashboard;
- any removed product workflow.

---

## 14. Visual acceptance gate

2026-10-01 execution override: the user requires desktop first. Validate the core desktop surfaces at 1440×900 before resuming narrow/mobile QA; the other sizes below are deferred, not current prerequisites. Existing 1440×1000 screenshots remain historical failure evidence. The complete proposed module/control/motion implementation sequence is in [SHADCN_UI_REDESIGN_ROADMAP_2026-10-01.md](SHADCN_UI_REDESIGN_ROADMAP_2026-10-01.md); proposals there do not imply visual acceptance or replace this canonical visual baseline.

A visible slice is not complete after JSX/build only.

Minimum browser evidence for a relevant surface:

- 1440px
- 1024px
- 768px
- 375px
- 320px when supported

Check:

- no horizontal overflow unless the working surface intentionally scrolls;
- no clipped labels/buttons;
- correct sticky/scroll ownership;
- focus-visible;
- pointer hit targets;
- selection vs focus;
- Dialog focus trap/return;
- Popover/Dropdown collision;
- dark/light hierarchy;
- reduced motion;
- empty/loading/error states.

If browser evidence does not exist, status remains `BLOCKED_VISUAL` or `INTEGRATED_NOT_CUT_OVER`.

---

## 15. Agent implementation rule

For every visible VNext change:

1. Read this baseline.
2. Identify the functional behavior in `5e86a0b` or current accepted implementation.
3. Reuse `@frameforge/ui` before creating any local primitive.
4. Keep shadcn new-york radius/control proportions.
5. Use semantic tokens instead of hard-coded palette values.
6. Do not remove product behavior for visual simplicity.
7. Do not add a new global bar/card system.
8. Run affected build/tests.
9. Perform rendered-browser QA before claiming visual completion.
10. Update parity documents only after evidence exists.

---

## 16. Current first-wave consumers

The first surfaces required to conform to this baseline are:

- `packages/ui/src/theme.css`
- `apps/web/components/app-shell/TopBar.tsx`
- `apps/web/components/app-shell/NavRail.tsx`
- `apps/web/app/(workspace)/productions/page.tsx`
- Shot Table shell and Inspector
- Review
- shared Dialog / Popover / DropdownMenu consumers

Do not expand visual refactoring to every feature simultaneously. Stabilize these shared owners first, then migrate feature surfaces incrementally.
