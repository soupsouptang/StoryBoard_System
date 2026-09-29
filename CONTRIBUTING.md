# Contributing to FRAMEFORGE

FRAMEFORGE is in active Legacy → VNext convergence. Changes must preserve product behavior while reducing, not multiplying, authoritative owners.

## Default flow

1. Start from current `master`.
2. Read root `AGENTS.md` and the nearest nested `AGENTS.md`.
3. For migration work, read `ACTIVE_WORKSTREAMS.md` and `CANONICAL_OWNER_MATRIX.md`.
4. Create a focused branch. Do not develop directly on `master`.
5. Implement one coherent slice.
6. Run targeted tests first, then broader gates according to blast radius.
7. Update parity/owner/migration evidence in the same slice when reality changed.
8. Push the branch and open a PR using the repository template.
9. Do not merge while repository checks are red or still running.

## Branch names

Examples: `fix/shot-conflict-copy`, `refactor/export-owner`, `feat/presence-redis`, `docs/owner-reconciliation`.

## No direct-master rule

Direct pushes to `master` are reserved for explicit user-authorized emergency repair when PR flow is unavailable. GitHub plan limitations may prevent technical branch protection; that does not change this repository rule.

## Evidence over claims

A capability is not migrated because a directory, component, route, package, or test exists. State promotion requires a real consumer and the gates defined in `AGENTS.md`.

Do not claim `CUT_OVER` or `LEGACY_RETIRED` without machine-readable migration evidence and zero-consumer proof for the old owner.

## Generated code and one-off scripts

Do not commit ad-hoc root patch scripts, terminal transcripts, reject/orig files, temporary databases, screenshots, or debug artifacts. Reusable tooling belongs in an intentional `tools/`, `.github/scripts/`, or test utility location.

## Production

Repository CI is non-production. Do not add deployment, DNS, proxy, production database, Redis mutation, or secret-changing steps to PR workflows without explicit user authorization.
