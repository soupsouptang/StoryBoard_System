# Contributing to FRAMEFORGE

FRAMEFORGE is in architecture convergence. Contributions must preserve product behavior while reducing duplicate ownership.

## Default flow

1. Start from current `master`.
2. Create a narrow task branch.
3. Read root `AGENTS.md` and any nearer nested `AGENTS.md`.
4. For migration work, read `ACTIVE_WORKSTREAMS.md` and `CANONICAL_OWNER_MATRIX.md`.
5. Make the smallest coherent change.
6. Run targeted tests first, then affected build/integration/browser gates.
7. Update parity/ownership documentation in the same slice when reality changes.
8. Open a PR using the repository template.
9. Merge only after relevant Actions are green and the PR contains the required evidence.

Do not use direct pushes to `master` as the normal workflow even when server-side protection is unavailable.

## Architecture

- One capability has one authoritative runtime owner.
- Canonical VNext targets are `apps/web`, `apps/api`, and root `packages/*`.
- Legacy remains until real consumers move.
- Routers own HTTP concerns; services/commands own business mutation rules.
- PostgreSQL + Alembic are the persistent target.
- Presence is ephemeral.
- AI is disabled by default and must follow Provider → Proposal → Human Review → Standard Command → Audit.
- A scaffold, file, route, component, or isolated passing test is not cutover evidence.

## UI

Visible changes require rendered browser verification at the widths and interaction states defined in `AGENTS.md`.

## Temporary tooling

One-off patch/replacement scripts, terminal transcripts, debug databases, and scratch artifacts do not belong at repository root.
