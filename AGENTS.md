# FRAMEFORGE — Repository Constitution & Agent Rules

This file is the repository-level execution constitution for FRAMEFORGE.

It is intentionally **stable**. Do not turn it into a migration diary, sprint board, or historical transcript.

Active user instructions take precedence. Inside `storyboard-system/`, the nearest `storyboard-system/AGENTS.md` additionally governs Legacy-specific implementation details. Nested rules may refine local execution, but they must not silently violate repository-level safety, ownership, persistence, AI, Presence, or production invariants defined here.

---

## 0. Instruction and Truth Precedence

When instructions or evidence conflict, resolve them in this order:

1. Explicit instructions in the active user conversation.
2. The nearest applicable `AGENTS.md`.
3. This root `AGENTS.md`.
4. The canonical document for the question being answered.
5. Runtime/code/test evidence.
6. Historical implementation patterns.
7. Agent assumptions.

Do not use stale documentation to overrule verified runtime evidence. Do not use current code to silently overrule an explicit newer product decision.

If code and canonical documentation disagree, determine the real owner and behavior first, then repair the canonical documentation in the same coherent slice when practical.

---

## 1. Product Golden Baseline

`FRAMEFORGE_PRODUCT_BASELINE = 5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`

This commit is the functional product-behavior inventory used to prevent accidental feature loss during the VNext-native rebuild. It is a product-capability reference, not a Legacy runtime, API, database, or old-project compatibility target.

Rules:

- A capability present at the Golden Baseline must not disappear silently.
- The baseline is **not** permission to restore behavior that the user explicitly removed or changed later.
- The baseline is **not** a requirement to preserve Legacy implementation details, DOM structure, CSS architecture, or framework choices.
- Newer explicit user decisions and documented accepted product changes override baseline behavior.
- As of 2026-10-02, Legacy project databases/data are not migrated, Legacy API compatibility is not required, and Legacy runtime parity is not a release gate.
- The only Legacy compatibility surface retained is a portable project export produced by the Legacy application that the VNext importer can map. Narrow Legacy source changes are allowed solely to make that export contract reliable and testable.
- Do not create fake pages, mock cards, placeholder endpoints, or decorative shells to claim parity. Build the real capability or mark it missing/blocked.
- Product parity must be tracked in the parity documents, not by optimistic prose in this file.

Canonical parity ledgers:

- `storyboard-system/docs/PRODUCT_PARITY_MATRIX.md`
- `storyboard-system/docs/SCREEN_PARITY_MATRIX.md`
- `storyboard-system/docs/API_ROUTE_PARITY_MATRIX.md`
- `storyboard-system/docs/UI_PRIMITIVE_PARITY.md`

---

## 2. Canonical Target Architecture

FRAMEFORGE converges toward one canonical target:

- `apps/web` — canonical Web application: Next.js 16 + React 19.
- `apps/api` — canonical backend API: FastAPI + async SQLAlchemy 2.
- `packages/ui` — canonical `@frameforge/ui`.
- `packages/types` — canonical shared types.
- `packages/contracts` — canonical cross-runtime contracts.
- `packages/timecode` — canonical timecode logic.
- PostgreSQL — canonical persistent database target.
- Alembic — canonical production schema-history owner.
- Redis — canonical ephemeral Presence backend using TTL/pubsub or an equivalent explicitly approved ephemeral mechanism.

`storyboard-system/` is now a Legacy reference and temporary export-bridge source, not a target runtime that VNext must remain compatible with. Required product behavior may be reimplemented natively in VNext; old project data and old API contracts are out of scope.

The repository currently contains hybrid/parallel implementations. Their existence is migration evidence, not proof of ownership transfer.

### Core invariant

`One capability → one authoritative runtime owner → one canonical migration destination.`

Do not introduce a second long-lived architecture because it is easier to implement.

Temporary adapters are allowed only when their source owner, target owner, migration purpose, and deletion condition are explicit.

---

## 3. Stable Constitution vs Dynamic State

This file defines stable execution rules.

Dynamic state belongs in:

- `storyboard-system/docs/ACTIVE_WORKSTREAMS.md` — compact current coordination ledger.
- `storyboard-system/docs/CANONICAL_OWNER_MATRIX.md` — current/target owner and cutover gates.
- `storyboard-system/docs/worklogs/VNEXT_PROGRESS.md` — historical execution evidence when history is actually useful.
- parity matrices — capability-specific migration evidence.

Do not hardcode a current HEAD, current sprint order, temporary blocker, current test count, or one-day status snapshot into this constitution.

Before choosing the next migration slice, read the current dynamic sources instead of trusting an old priority list embedded in prompts or comments.

---

## 4. Documentation Authority

Each architecture document has one job:

- `ARCHITECTURE.md` records **current repository/runtime reality**.
- `ARCHITECTURE_MIGRATION.md` records **VNext rebuild boundaries, the limited Legacy export bridge, verification, and Legacy retirement rules**.
- `LIFECYCLE_ARCHITECTURE_PLAN.md` records **lifecycle phases and phase gates**.
- `FRAMEFORGE_COMPONENT_LIBRARY_CODEX_MASTER.md` governs **UI/component/motion/icon/graphics migration**.
- `SHADCN_UI_BASELINE.md` is the **canonical VNext visual baseline** for shadcn geometry, neutral semantic color, Shell proportions, table/Inspector hierarchy, overlays and visual QA.
- `CANONICAL_OWNER_MATRIX.md` records **capability ownership and cutover state**.

Do not copy the same long status narrative into all of them.

A current fact must not be written as a target. A target must not be written as already verified.

---

## 5. Migration State Model

Capability migration uses these states:

- `VERIFIED` — current ownership/behavior has been proven by code/runtime/test audit.
- `IMPLEMENTED_NOT_INTEGRATED` — target code exists but no real consumer uses it.
- `INTEGRATED_NOT_CUT_OVER` — a real VNext consumer uses the target path, but the capability is not yet accepted as complete.
- `CUTOVER_READY` — VNext acceptance prerequisites are proven; rollback/recovery is understood where relevant.
- `CUT_OVER` — VNext is the authoritative runtime owner for the capability.
- `LEGACY_RETIRED` — the Legacy runtime is no longer needed; the narrowly scoped portable-project exporter may remain until its file-mapping contract is frozen and tested.
- `BLOCKED` — a required prerequisite, decision, credential, environment, or dependency is missing.
- `BLOCKED_VISUAL` — code or functional checks may pass, but required rendered-browser visual evidence is missing or has failed.

A file, route, component, test, migration, package, or directory existing does **not** prove migration completion.

Never promote state merely because:

- a scaffold exists;
- a build passes;
- an isolated component renders;
- a test file exists;
- an endpoint has the right name;
- a replacement directory exists;
- a TODO says the migration is done.

---

## 6. Single Owner Invariant

Before implementing or migrating a capability, identify the authoritative owners that matter.

At minimum:

- DOM / Render owner
- State owner
- Event owner
- Request owner
- Mutation owner
- Persistence owner

Where relevant also identify:

- Validation owner
- Permission owner
- Revision owner
- Audit owner
- Realtime owner
- Cache owner
- Schema owner

Do not maintain two authoritative owners for the same responsibility.

Do not introduce mirrored Legacy/VNext runtime behavior or dual-write persistence for compatibility. The only permitted cross-version bridge is file-based: Legacy exports a portable project artifact and VNext imports/maps that artifact.

---

## 7. Start-of-Task Protocol

Before editing repository code:

1. Inspect current branch/HEAD and dirty work.
2. Read `ACTIVE_WORKSTREAMS.md` and `CANONICAL_OWNER_MATRIX.md` when the task touches migration ownership.
3. Use narrow search before broad file reading.
4. Trace the real consumer and runtime entry before deciding what is obsolete.
5. Preserve unrelated user work.

Preferred repository inspection:

`git status`  
`git branch --show-current`  
`git rev-parse HEAD`  
`git log --oneline -n 8`  
`rg`  
`git diff`  
`git log -- <path>`

Do not begin a task by dumping the entire repository into context.

Do not repeatedly reread unchanged large files when `git diff` or a narrow search is sufficient.

---

## 8. Dirty Work Protection

Treat existing uncommitted work as user work unless evidence proves otherwise.

Never automatically use destructive cleanup such as:

- `git reset --hard`
- `git checkout .`
- `git restore .`
- `git clean -fd`
- blanket stash/reset workflows
- recursive deletion of unknown artifacts

If existing work overlaps the task, inspect it and integrate with it.

Never discard unrelated valid work to make the current task easier.

---

## 9. Legacy Reference and Export-Bridge Protocol

`storyboard-system/` is frozen for ordinary feature development. It is no longer a runtime/API/database compatibility target.

Allowed Legacy changes are limited to:

- fixes strictly necessary to keep the portable project exporter runnable;
- export-schema/mapping changes required so a Legacy project file can be imported by VNext;
- focused exporter fixtures/tests and documentation;
- critical security fixes only when needed to safely run the exporter during the bridge period.

Do not add new product features, new persistence owners, new API compatibility layers, or dual-write adapters to Legacy.

Legacy runtime code may be retired once required product behavior has been captured/reimplemented in VNext and the portable-project export/import bridge has stable fixtures and round-trip evidence. Zero API parity, zero database backfill, and zero old-client compatibility are **not** retirement gates.

---

## 10. Production and Data Safety

Unless the active user explicitly authorizes production mutation:

- local implementation only;
- local builds only;
- isolated/synthetic tests only;
- synthetic or copied-data migration rehearsals only;
- read-only production investigation only when explicitly requested and safe.

Do not mutate production application runtime, databases, Redis, DNS, reverse proxies, cloud infrastructure, or production secrets without explicit authorization.

In `ENVIRONMENT=production`:

- required credentials/secrets must fail closed when missing;
- never invent fallback credentials;
- never hardcode production passwords, private keys, tokens, or API keys;
- never silently repair production schema during application startup.

Real user data, media, backups, and environment files are not disposable test fixtures.

---

## 11. Save, Revision, and Conflict Semantics

Preserve explicit save states:

- `dirty`
- `saving`
- `acknowledged`
- `failed`
- `conflict`

A client mutation is **not saved** when it is dispatched. It is saved only after authoritative server acknowledgement.

Revision-sensitive mutations must preserve expected-revision semantics and surface real `409 Conflict` behavior.

Do not:

- mark failed requests as saved;
- let a server refetch blindly overwrite a dirty local draft;
- create a second save path with weaker conflict semantics;
- generate fake revision/audit events for no-op writes.

Single and bulk mutation paths must converge on the same domain rules even when they use different HTTP endpoints.

---

## 12. Backend Boundaries

FastAPI routers own HTTP concerns:

- request parsing;
- authentication;
- authorization checks;
- schema validation;
- dependency injection;
- status/error mapping;
- response serialization.

Routers do **not** own:

- raw SQL;
- multi-step business workflows;
- revision orchestration;
- audit generation;
- cross-aggregate domain behavior.

Business mutations must flow through dedicated Application Services / Command Handlers that apply relevant:

- permissions;
- validation;
- revision checks;
- revision increments;
- conflict detection;
- audit recording;
- transaction boundaries;
- domain invariants.

AI, WebSocket, background, admin, import, and migration paths must not become alternate mutation systems that bypass the canonical command/service boundary.

---

## 13. Persistence Ownership

PostgreSQL is the persistent target. SQLAlchemy 2 async patterns are canonical for target application persistence.

Alembic owns production schema history.

Legacy SQLite databases and old project data are not migrated. VNext starts from its own clean PostgreSQL schema; no SQLite→PostgreSQL backfill, dual-write, source-schema upgrade, or old-project database cutover is required.

`Base.metadata.create_all(...)` is restricted to explicit development/test fixtures. It is not the production schema strategy.

Before VNext database acceptance, verify applicable:

- empty database → Alembic head;
- transaction behavior;
- constraints and foreign keys;
- revision/conflict behavior;
- test fixture isolation;
- backup/recovery plan;
- migration verification against a realistic isolated copy.

If a new database has accepted authoritative writes, rollback must not silently discard those writes.

---

## 14. AI Invariant

Outbound AI network calls are disabled by default.

No provider request may happen merely because AI code exists.

Canonical governed flow:

`Provider → Proposal → Human Review → Standard Command → Audit`

AI must respect normal permissions, validation, revision/conflict semantics, and audit logging.

Provider code must not obtain a privileged shortcut to persistent writes.

Do not claim AI integration because a provider, mock, or proposal class exists. Real integration requires the governed end-to-end path and a real consumer.

Future AI/i18n compatibility may be prepared architecturally, but do not expose new product functionality unless the active task authorizes it.

---

## 15. Presence and Realtime Invariant

Presence is ephemeral.

Examples include cursors, viewport, active-user indicators, temporary selection broadcasts, typing state, heartbeats, and temporary edit locks.

Presence must not be persisted as durable PostgreSQL business state.

Canonical target: Redis-backed ephemeral state with TTL/pubsub (or an explicitly approved equivalent), authenticated realtime transport, and reconnect behavior.

Realtime transport is not a second business mutation system.

Durable edits sent through WebSocket/realtime paths must still preserve the same permission, revision, audit, and transaction rules as normal commands.

Do not connect unauthenticated or fake Presence merely to make the UI look complete.

---

## 16. Web and UI Ownership

Canonical layering:

### Primitive — `@frameforge/ui`

Knows zero FRAMEFORGE business logic or product-specific strings. Built from shadcn/Radix-style accessible primitives and the FRAMEFORGE token system.

### Pattern

Reusable composed interaction structures such as dialogs, inspectors, split panes, toolbars, menus, and editor shells.

### Domain

Understands film/storyboard concepts such as Shot, Scene, Reel, Timecode, Revision, Asset, and Production Method, but does not own route-level orchestration.

### Feature — `apps/web`

Owns queries, mutations, permissions, route integration, feature orchestration, and business state.

Default state ownership:

- server state → query/server-state layer;
- workspace UI state → one canonical Zustand workspace store architecture;
- selection and inspector targets → separate semantics coordinated by workspace state;
- local form/editor drafts → local form/component draft state.

Do not duplicate authoritative server entities into long-lived client stores without a concrete reason.

Do not keep the same authoritative value simultaneously in local React state, Zustand, URL state, query cache, and Legacy globals without naming the source of truth.

---

## 17. UI/Product Design Invariants

The VNext UI must recover the functional density and information architecture of the accepted FRAMEFORGE product without becoming “dense for density’s sake.”

Follow `FRAMEFORGE_COMPONENT_LIBRARY_CODEX_MASTER.md` and `storyboard-system/docs/SHADCN_UI_BASELINE.md`.

Stable rules:

- shadcn/Radix are foundations inside the canonical `packages/ui`, not a third parallel UI system.
- Do not globally rewrite shadcn corner-radius geometry, Card proportions, spacing rhythm, or hierarchy merely to create a different visual style.
- Professionalism comes from hierarchy, precision, predictable workflows, typography, spacing, and strong interaction ownership — not indiscriminate compression.
- Prefer read-first tables; frequent edits may be inline, while deep edits belong in an explicit inspector/editor flow.
- Do not restore product modes or controls that were intentionally removed.
- Do not invent new hubs, dashboards, pages, or workflow concepts to fill migration gaps.
- Dynamic icons and motion may communicate state, direction, loading, completion, expansion, sync, and continuity, but must remain semantically recognizable.
- Motion must be interruptible, must not own business state, and must not leave invisible interactive layers after exit.
- Support `prefers-reduced-motion` without changing business behavior.
- Keyboard focus and mouse selection are different states; do not use focus styling as a substitute for selection styling.

---

## 18. UI QA Hard Gate

For visible UI changes, source inspection, JSX review, Tailwind review, or a successful build is not sufficient.

Verify rendered behavior in a real browser at relevant widths, normally including approximately:

- 1440
- 1024
- 768
- 375
- 320 where the surface is supported

Check applicable:

- overflow and wrapping;
- selection;
- `:focus-visible`;
- keyboard navigation;
- pointer hit targets;
- disabled states;
- menus/popovers/dialogs;
- overlay closing;
- focus trap and focus return;
- z-index/layering;
- sticky/scroll behavior;
- responsive layout;
- loading/empty/error states;
- motion lifecycle;
- reduced motion.

Ignore external browser-automation overlays that are not part of the application DOM.

If actual visual verification cannot be performed, mark the relevant gate blocked rather than claiming visual completion.

---

## 19. API and UI Parity Gates

### API migration

Matching a path name is not parity. Verify applicable:

- method/path;
- auth and permissions;
- request schema;
- response schema;
- status codes;
- error semantics;
- revision/conflict semantics;
- audit behavior;
- transaction/persistence behavior;
- real consumer.

### UI primitive migration

A primitive is not migrated because a replacement file exists in `packages/ui`.

Verify:

- a real consumer imports it;
- rendered visual behavior;
- keyboard/focus behavior;
- accessibility;
- responsive behavior;
- VNext real-consumer ownership. Legacy consumer removal is repository cleanup, not an API/database compatibility gate.

The Legacy `@frameforge/ui` package is reference-only for the rebuild. Do not copy its visual system into VNext; it may be removed with the Legacy runtime once required product behaviors have been captured and the export bridge no longer depends on it.

---

## 20. Testing and Evidence Order

Use progressively broader verification:

1. targeted unit test;
2. targeted integration/contract test;
3. affected package tests;
4. typecheck/lint where applicable;
5. build;
6. real consumer/runtime verification;
7. browser UI QA where applicable;
8. broader regression.

Run the narrowest useful test first, then expand according to blast radius.

A passing isolated test does not prove cutover.

Acceptable migration evidence includes:

- real consumer import/call path;
- registered runtime route;
- integration/contract test;
- browser verification;
- clean PostgreSQL bootstrap/integration rehearsal;
- portable Legacy project export → VNext import round-trip where that bridge is affected;
- request/response trace;
- removal of the old consumer;
- successful affected build/regression.

Do not infer integration from naming similarity or directory structure.

---

## 21. Scope and Dependency Discipline

Make the smallest coherent change that advances the requested milestone.

Do not bundle unrelated:

- cleanup;
- formatting churn;
- dependency churn;
- directory renaming;
- style rewrites;
- speculative abstractions.

Before adding a dependency, confirm an existing repository dependency does not already own that role.

Avoid parallel libraries for the same architectural responsibility, especially for:

- state management;
- server-state management;
- UI primitives;
- validation;
- HTTP clients;
- ORM/migrations;
- realtime transport;
- date/timecode logic.

Shared packages should reduce duplication, not become hidden global application layers.

### Root package allowlist

The root `packages/` namespace is intentionally closed. The only canonical top-level shared packages are:

- `packages/ui`
- `packages/types`
- `packages/contracts`
- `packages/timecode`

Do not create additional top-level packages such as `common`, `core`, `shared`, `utils`, `hooks`, `domain`, `api-client`, or similar convenience layers by default.

New code belongs in the owning application or one of the four existing packages unless the user explicitly approves a new shared package as an architecture change. Any approved addition must update the package-boundary gate in the same coherent commit.

A new package is not justified merely because code is reusable in theory. Prefer app-local modules until there is a demonstrated cross-application or cross-runtime ownership boundary.

---

## 22. Parallel/Sub-Agent Work

Use parallel agents only for genuinely separable investigation or verification.

Good scopes include:

- independent ownership audit;
- route inventory;
- parity comparison;
- test failure investigation;
- dependency tracing;
- documentation consistency audit;
- visual QA evidence review.

Each delegated slice must specify scope, allowed files, expected output, whether edits are permitted, and verification requirements.

Do not allow agents to edit the same files concurrently without explicit coordination.

The primary agent remains responsible for integration, architecture decisions, tests, documentation truth, and commit quality.

---

## 23. Worklog Discipline

Use `storyboard-system/docs/ACTIVE_WORKSTREAMS.md` as the compact current coordination ledger.

Keep only current:

- track;
- owner/executor;
- scope;
- state;
- gate;
- blocker;
- commit.

Do not turn it into an endless historical transcript.

Long history belongs in archival worklogs only when that history remains useful.

---

## 24. Milestone Completion

A migration slice is complete only when all applicable conditions are true:

- implementation exists;
- a real consumer uses it;
- relevant tests pass;
- runtime/rendered behavior is verified;
- the old authoritative owner exits or is proven non-authoritative for that slice;
- canonical docs/matrices reflect reality.

Otherwise label the slice accurately.

Do not call:

- `IMPLEMENTED_NOT_INTEGRATED` complete;
- `INTEGRATED_NOT_CUT_OVER` cut over;
- `CUT_OVER` legacy retired.

---

## 25. Commit and Push Discipline

Prefer focused, descriptive commits such as:

- `refactor(ui): converge frameforge ui ownership`
- `refactor(api): consolidate fastapi mutation ownership`
- `refactor(web): cut storyboard workspace over to apps web`
- `feat(presence): add redis-backed realtime presence`
- `docs(architecture): reconcile canonical migration owners`

Before committing, inspect status and staged diff.

Do not commit secrets, local environment files, transient diagnostics, generated debugging artifacts, or unrelated user changes.

For repository-modification tasks that are being executed autonomously, push verified focused commits when remote authorization is available unless the active user instruction says not to push.

After a successful push in a continuing migration task:

1. re-read repository status;
2. re-read `ACTIVE_WORKSTREAMS.md`;
3. re-read `CANONICAL_OWNER_MATRIX.md`;
4. continue with the highest-priority unblocked coherent slice until the requested milestone or a valid stop condition is reached.

A successful push is a checkpoint, not proof of migration completion.

---

## 26. Stop Conditions

Stop and report when continuing requires:

- external credentials that are unavailable;
- explicit production authorization;
- an irreversible user-data decision;
- remote Git authorization that cannot be resolved;
- a destructive production operation;
- two valid product behaviors that conflict and repository evidence cannot resolve.

Do **not** stop merely because:

- a scaffold exists;
- one component migrated;
- one test passed;
- one directory was created;
- one commit was pushed;
- the remaining work is large.

When no legitimate blocker exists and the user requested continued migration, continue.

---

## 27. No False Completion

Never claim:

- “fully migrated”;
- “React complete”;
- “FastAPI complete”;
- “PostgreSQL complete”;
- “Presence complete”;
- “AI complete”;
- “Legacy removed”;

unless real consumers, runtime ownership, tests, and removal gates support the statement.

Prefer exact status language, for example:

> The target implementation exists and passes its isolated tests, but the real workspace still consumes the Legacy owner. State: IMPLEMENTED_NOT_INTEGRATED.

Accuracy is more important than optimistic progress reporting.

---

## 28. Efficient Long-Running Migration Loop

For long tasks, use a bounded loop:

`Inspect → choose one coherent slice → establish owners → implement → targeted verify → integrate real consumer → broader verify → update canonical docs/matrix → commit → push → re-read dynamic state → continue.`

Do not accumulate many unverified architectural changes before testing.

Do not postpone documentation truth reconciliation until the very end.

Do not rewrite a confusing subsystem before tracing its consumer, state, event, request, mutation, and persistence path.

---

## 29. Final Reporting

At a meaningful checkpoint or legitimate stop condition, report concisely:

- Completed
- Verified
- Migration state
- Tests / browser QA
- Commit
- Push status
- Remaining blocker
- Next unblocked slice

Do not dump a transcript of every command.

Report architectural outcomes and evidence.

---

## 30. Core Principle

When uncertain, prefer:

`evidence over assumption`  
`integration over scaffolding`  
`one owner over parallel owners`  
`runtime truth over naming`  
`real consumer verification over isolated existence`  
`small coherent slices over broad rewrites`  
`documentation truth over optimistic status`  
`continuation over premature completion`

The objective is not to make FRAMEFORGE look migrated.

The objective is to make FRAMEFORGE actually converge.
