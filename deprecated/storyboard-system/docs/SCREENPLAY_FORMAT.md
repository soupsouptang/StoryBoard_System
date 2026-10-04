# Screenplay and US production storyboard export

Load `/static/screenplay.js` before the parent invokes the synchronous global:

```js
const html = FrameForgeScreenplay.build({
  project, shots, fields, layout: 'screenplay', mediaMap,
  includeImages: false
});
// Parent opens its same-origin preview and writes this complete HTML document.
// The generated document loads /static/print-preview.js and supplies #printBtn.
```

`layout` accepts `screenplay` or `us-board`; other values throw. The module does
not mutate inputs, access app state, open windows, fetch images, or require a DOM.
Browser print and Save as PDF use the same already-paginated document. The parent
owns preview creation, field selection, incomplete-data notices, and UI integration.
No edits to app.js, index.html, server.py, or print-preview.js are required by this
module itself. The parent must serve the script at the documented static URL.

## Selection and actual data

`fields` is an array of field keys or `{key}` objects. It must contain only the
user's currently selected, non-deleted columns. Omitted, null, or empty selection
exports no shot text. There is deliberately no default field fallback: the builder
cannot infer the parent's deleted-column preferences. Standard presentation fields
are allowlisted; internal IDs, timestamps, revisions, and JSON payloads are never
exported, even if requested. Explicit `custom:KEY` fields read only their own scalar
values from `shot.custom_fields`. US-board custom labels use KEY.

Screenplay maps scene/script_scene_type/script_time_of_day to a capitalized slug;
description and action each become action paragraphs if selected and nonblank.
script_character is the actual capitalized cue; script_parenthetical is enclosed
in parentheses if needed; dialogue and voiceover are speech; transition is
capitalized and aligned right. Other selected production fields belong to the
US-board layout and are omitted from screenplay. No scene type, time, speaker,
shot number, duration, or narrative text is inferred. Speech without a selected,
nonblank character retains an empty cue position. Voiceover appends `(VO)` only
to an actual selected character. US-board displays only selected labels and values,
including blank values and numeric zero. Its image frame is always present.

The parent should show preflight notices for incomplete slugs and missing speakers
before export, using the same selected fields. It should not insert warnings into
the screenplay or substitute placeholder narrative.

Only actual `project.title` (falling back to `project.name`), `project.author`, and
`project.contact` populate an optional screenplay cover. There is no default title,
author, contact, date, or "written by" text. Parent adapters may map genuine metadata
to these keys; owner usernames are not treated as authors. Metadata selection is
independent of shot columns. Excessive metadata continues on unnumbered cover
sheets. US-board has a fixed format label and no project metadata cover.

## Typography and pagination

US Letter 8.5 × 11 inches; top/bottom/right margins 1 inch; left margin 1.5 inches.
Courier/Courier New at 12 pt, 12 pt line height. Character cues begin 3.5 inches from
paper left; dialogue 2.5 inches; parentheticals 3 inches. A blank line separates
paragraph types. Slugs, character cues, and transitions are capitalized. Screenplay
pages reserve 54 line slots inside the 9-inch content height. Short slugs/cues and
parentheticals stay with the beginning of their following content when possible.
Long blocks split across explicit pages without truncation, repeated speech, or
invented MORE/CONTINUED markers. Page numbers appear at upper right except on
cover sheets and screenplay page 1; screenplay page 2 is numbered `2.`.

Deterministic wrapping budgets 10 Courier cells per inch, preserves whitespace
across soft wraps, normalizes CRLF/CR to LF and tabs to four spaces, and splits
overlong words. Unicode graphemes stay intact where Intl.Segmenter is available.
CJK and emoji reserve two cells. CJK/emoji font fallback remains an approximation;
installed fonts can affect glyph appearance. Explicit line boxes and wide-glyph
spans stabilize page counts. There is no clipping/ellipsis or overflow-hidden rule.
Browser print must use Letter, 100% scale, and disable browser headers/footers;
automation should set preferCSSPageSize=true and displayHeaderFooter=false.

Rich runs come from `shot.rich_text_json[field]` and are used only if their joined
text exactly matches the current plain field. Underline is preserved through
wrapping; bold, italics, size, and highlight are ignored. The standalone renderer
implements this restricted safe subset itself, so FrameForgeRichText is optional
and no raw HTML from a helper or a field is interpolated. Both layouts use this
fixed typography to keep pagination deterministic.

US-board uses two 4.25-inch panels per page, each with a 16:9 frame and up to 12
lines of selected text. Long notes continue in additional panels with blank frames.
It is a US production storyboard template, not a universal AFI storyboard standard.

## Images and HTML safety

Screenplay never includes images. US-board images require `includeImages === true`.
`mediaMap` is a Map (exact key match) or an own-property dictionary keyed only by
`shot.id`; it never falls back to shot number, array position, or shot media fields.
Values are URL strings. Accepted: base64 PNG/JPEG/WebP/GIF, root-relative same-origin
paths, and absolute HTTP(S)/blob URLs matching the calling browser's origin. Without
a browser location, use root-relative paths or raster data URLs. Remote URLs,
SVG data URLs, script URLs, and malformed values produce a blank frame. Blob URL
lifetimes are owned by the parent. All text and attribute values are escaped;
the only executable script is the fixed same-origin print-preview.js resource.

## Sources and limitations

The [AFI-authored Screen Education handbook, Script Formatting Guide, PDF index 62](https://myhero.com/hosted/PDF/AFI-ScreenEd-Handbook.pdf#page=63)
specifies the margins, Courier typography, underline convention, paragraph spacing,
capitalization, and page-number exclusions used here. Its approximate character,
dialogue, and parenthetical positions are interpreted from the paper edge, as
requested. The implementation's line budget, wrap algorithm, and storyboard panels
are engineering choices, not AFI certification requirements.

[Current AFI admissions requirements](https://conservatory.afi.com/admissions-requirements/)
request screenwriting samples in professional format. Neither this exporter nor
these references guarantee acceptance or AFI certification. No universal AFI
storyboard standard is claimed.

## Verification

```sh
node tests/screenplay_qa.cjs
node tests/screenplay_qa.cjs --browser
```

The browser suite uses installed Playwright and headless Edge when available,
otherwise Playwright Chromium. `SCREENPLAY_BROWSER` may select an executable.
Tests cover escaping, omitted/deleted/internal fields, missing speakers, actual
metadata, strict rich text, image opt-in and URL safety, exact long-text retention,
Unicode wrapping, page numbers, boundary cases, browser geometry, PDF page counts,
and the existing same-origin print button. PDFs are checked in memory.
