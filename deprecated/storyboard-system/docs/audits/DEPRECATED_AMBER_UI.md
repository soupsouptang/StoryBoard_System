# Deprecated amber UI inventory (2026-09-29)

The component-library specification § UI tokens says the default is Neutral and explicitly forbids dirty-gold/amber primary, yellow navigation, and a saturated color per production method. The visible V-Web yellow appearance came from a still-live Tailwind palette and hard-coded classes, not from the current Legacy workspace theme.

## Source inventory before removal

| Owner | Files | Removed visual path |
| --- | ---: | --- |
| `apps/web/app` | 11 | Login, share, productions, production layout and assets/deliverables/review/settings/shots/storyboard/timeline routes used amber buttons, selections, labels, and borders. |
| `apps/web/components` | 11 | NavRail, TopBar, Inspector, and storyboard cards/header/grid/wall/import/new-shot/VO/bulk actions used amber UI states. |
| `apps/web/tailwind.config.ts` | 1 | The custom `amber` palette was still available to every route. |
| `apps/web/lib/media-resolver.ts` | 1 | Stock/archive placeholders and review badge used amber/yellow; all method placeholders also used saturated per-method colors. |
| `packages/ui/src/primitives.css` | 1 | Shared primary/focus fallbacks were still gold. |
| **Canonical target total** | **25** | |

The legacy `storyboard-system/static/m3.css` was a separate unused Material 3 amber stylesheet: `static/index.html` does not load it, the build does not generate it, and the only live source reference was a stale README sentence. It was removed and the README corrected. Three unresolved `var(--amber)` references in active Legacy `styles.css` were changed to the existing `--primary` token. The rich-text editor's yellow **content highlight** option is user data formatting, so it remains. The vendored Three.js bundle and real 3D light colors are not UI accents and remain untouched.

## Retired implementation

- V-Web primary/action, hover, selection, and focus states now use semantic neutral tokens defined in `apps/web/app/globals.css` and exposed by `apps/web/tailwind.config.ts`.
- The old root `primitives.css` has been retired; `@frameforge/ui` now uses shadcn-style component classes and the shared semantic `theme.css`.
- Media placeholders use one quiet surface; method labels still communicate the category. Approval/error status semantics remain distinct.
- V-Web route behavior, including the real SRT download and disabled unavailable exports, remains unchanged by the palette removal.

## Verification gate

Search active V-Web and root UI source for `amber`, `yellow`, `#ffbf47`, `#ffd27d`, and `#30240d`; run the root UI and web builds; inspect rendered login, navigation, project and export views at desktop and narrow widths. No production deployment is authorized in this slice. Legacy UI remains the production owner until its documented cutover gate is met.
