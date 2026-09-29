# FRAMEFORGE CI & Repository Guardrails

This document explains the repository checks that protect FRAMEFORGE during concurrent migration work. It is operational documentation, not a migration status ledger.

## Integration model

Normal repository changes use:

`task branch → pull request → relevant Actions → merge`

Server-side branch protection is currently unavailable for this private repository/connection, so the same discipline is enforced voluntarily by `AGENTS.md` and observable CI checks.

Tracking issue: #7.

## Required guard families

| Workflow | Purpose | Typical failure meaning |
| --- | --- | --- |
| FRAMEFORGE CI | Canonical VNext + Legacy builds/contracts | A real build/test layer is broken |
| Regression Guard | Golden Baseline, repository hygiene, migration-doc coupling | Capability inventory was lost, temp artifacts were committed, or destructive contraction lacks evidence |
| Migration State Guard | Machine-readable owner/state evidence | A migration state is invalid or promoted without real evidence |
| PR Base Freshness | Require PR head to contain current master | Another conversation changed master after this branch diverged |
| PR Contract | Require scope/state/tests/safety/rollback in PR body | The proposed change cannot be audited from its PR |
| Router Mutation Boundary | Prevent new persistence mutations in HTTP routers | Business mutation logic is leaking back into routers |
| OpenAPI Compatibility Guard | Base→HEAD contract contraction detection | Routes/methods/security/response contracts were silently reduced |
| PostgreSQL Migration Rehearsal | PostgreSQL empty→head, schema drift, downgrade/re-upgrade | Alembic graph/model metadata no longer agree |
| Safety Invariants | Production fail-closed, AI default-off, Presence ephemeral, credential filenames | A repository-level safety invariant regressed |
| Legacy Generated Artifact Guard | Source/generated Legacy bundle consistency | Generated assets are stale or were hand-edited |
| VNext Browser UI Gate | Real Chromium responsive/interaction/visual regression | Rendered behavior or approved visual fingerprint drifted |
| Nightly Repository Deep Audit | Scheduled cross-cutting sanity pass | A dependency/manifests/guard condition deteriorated outside a normal PR |

## Evidence hierarchy

A green build proves only the layer it exercised. Migration state promotion also requires the real consumer and owner transitions defined in `AGENTS.md` and `.frameforge/migration-state.json`.

No workflow result alone authorizes `CUT_OVER` or `LEGACY_RETIRED`.

## Visual baseline

The UI workflow renders approved deterministic surfaces at:

- 1440
- 1024
- 768
- 375
- 320

Screenshots are retained as Actions artifacts. `.frameforge/visual-baseline.json` stores compact perceptual fingerprints derived from an approved successful run. The visual gate checks dimensions plus low-resolution luminance and edge drift. It is intended to catch accidental layout/theme regressions without making one-pixel antialiasing changes a permanent blocker.

When an intentional visual redesign is accepted, update the visual baseline only from an explicitly reviewed passing screenshot run and record the source run/head in the baseline file.

## Golden product baseline

`.frameforge/product-baseline.json` identifies the accepted functional inventory from `5e86a0b`.

The Golden Baseline:
- prevents silent loss;
- does not freeze Legacy DOM/CSS/framework details;
- does not override later explicit user decisions.

## Failure handling

Do not disable or weaken a failing gate merely to make a PR green.

Classify the failure:

1. real product/code regression → fix code;
2. real schema/contract drift → add the correct migration/contract update;
3. stale branch → replay onto current master;
4. intentionally accepted behavior change → update the authoritative baseline/ledger with evidence;
5. CI environment defect → fix the workflow while preserving the invariant.

Relevant diagnostics and screenshots are uploaded as workflow artifacts where practical.

## GitHub ruleset limitation

The repository should eventually enable an enforced `master` ruleset requiring these checks. Current GitHub plan/integration permissions prevent that configuration. Until then, direct `master` pushes remain prohibited by repository agent policy for ordinary migration work.
