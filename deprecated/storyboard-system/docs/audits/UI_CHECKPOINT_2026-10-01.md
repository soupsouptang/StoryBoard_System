# UI migration checkpoint — 2026-10-01

Upstream inspected: 9611be3. Local integration inspected: 01732b4. This is an incremental finding record, not a migration completion claim.

- Project covers and Shot Panel image/frame consumers now exist on master. Earlier blanket claims that covers only show monograms are obsolete. Visual and persistence checks remain pending.
- Review replies and quoted comments exist in the local integration only. The first production build found an array literal widening error in getCommentReferences; an explicit CommentReference[] annotation has been applied locally. Rebuild and publication of the complete Review slice are pending.
- Context menus still lack baseline wrap preferences and several row actions. Existing custom-field lifecycle controls must not be misreported as absent. Never add decorative actions without real state and API behavior.
- Canvas still uses the Legacy runtime. Board API/model/routes and independent project media upload remain migration gaps. Live Legacy consumers must not be deleted.
- VNext PDF remains unavailable. Ordinary print PDF, lossless project-PDF round trip, and best-effort third-party import are separate capabilities.

## Execution requirements

Preserve the original approved behavior and visual hierarchy while migrating to shadcn. A component replacement is not authorization to redesign or remove capabilities. Track each missing entry, interaction, persistence path, owner and acceptance evidence.

Publish each focused finding or correction promptly. Publication does not imply acceptance: record build, visual, backend and PostgreSQL validation separately. Latest user instructions restore visual and backend checks.

Screenshots are permanent audit evidence: retain originals in the local outputs/screenshots/2026-10-01 directory, publish copies under storyboard-system/docs/audits/screenshots/2026-10-01, and do not remove them during cleanup. Use synthetic data and exclude passwords, local IPs and private configuration. Each image must identify route, viewport, theme, data mode and inspected revision. No screenshots have been collected for this checkpoint yet.

Routine chat review/documentation uses Luna where supported; complex backend diagnosis may retain Sol. No Astra is required. Detailed security findings remain in the private local report.
