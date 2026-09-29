# Contributing to FRAMEFORGE

FRAMEFORGE is in an active Legacy → VNext convergence. Changes are evaluated by runtime ownership and verified behavior, not by directory names or implementation presence.

## Default workflow

1. Read the root `AGENTS.md` and the nearest nested `AGENTS.md`.
2. Read `storyboard-system/docs/ACTIVE_WORKSTREAMS.md` and `CANONICAL_OWNER_MATRIX.md` for migration work.
3. Create one short-lived task branch from current `master`.
4. Make the smallest coherent change.
5. Run the narrowest relevant tests first, then broader checks according to blast radius.
6. Update migration/parity evidence when ownership or product behavior changes.
7. Open a pull request and complete the repository PR template honestly.
8. Merge only after the affected validation jobs pass and the stated migration state is supported by evidence.

## Do not

- push broad feature/refactor work directly to `master`;
- delete Legacy owners because a replacement-looking file exists;
- promote migration state based on scaffolding or isolated tests;
- commit patch scripts, ANSI dumps, local environment files, secrets, temporary databases, or diagnostic output;
- bypass revision/conflict/audit rules with a second mutation path;
- use production data or production infrastructure for CI.

## Required evidence by change type

Visible UI changes require rendered browser verification. API changes require request/response and auth/error-contract verification. Persistence changes require Alembic evidence and realistic isolated database rehearsal. Generated Legacy workspace changes require deterministic rebuild verification. AI and Presence changes must preserve default-off / ephemeral invariants.

GitHub server-side branch protection is preferred when available; until then these rules remain mandatory repository process.
