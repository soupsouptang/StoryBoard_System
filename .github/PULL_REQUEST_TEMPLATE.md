## Scope

Describe the single coherent change in this PR.

## Ownership

- Current runtime owner:
- Target runtime owner:
- State owner:
- Request / mutation owner:
- Persistence owner:
- Old owner removed in this PR? If yes, provide zero-consumer evidence.

## Product parity

- Golden Baseline capability affected:
- PRODUCT_PARITY_MATRIX updated if behavior changed: [ ]
- SCREEN_PARITY_MATRIX updated if a route/screen changed: [ ]
- API_ROUTE_PARITY_MATRIX updated if API behavior changed: [ ]
- CANONICAL_OWNER_MATRIX / ACTIVE_WORKSTREAMS updated if ownership/state changed: [ ]

## Verification

- Targeted unit / contract tests:
- Integration tests:
- Build / typecheck:
- Browser QA (if visible UI):
  - 1440: [ ]
  - 1024: [ ]
  - 768: [ ]
  - 375: [ ]
  - 320 where supported: [ ]
- Keyboard / focus / overlay behavior checked when applicable: [ ]
- Reduced motion checked when applicable: [ ]

## Data and rollback

- Persistent schema/data impact:
- Alembic migration required: [ ] yes [ ] no
- Rollback / recovery plan:
- Production mutation in this PR: [ ] none

## Regression risks

List capabilities that could regress and how this PR proves they did not.

## Migration state

Select the most accurate state after this PR:

- [ ] VERIFIED
- [ ] IMPLEMENTED_NOT_INTEGRATED
- [ ] INTEGRATED_NOT_CUT_OVER
- [ ] CUTOVER_READY
- [ ] CUT_OVER
- [ ] LEGACY_RETIRED
- [ ] BLOCKED

Do not select a stronger state than the evidence supports.
