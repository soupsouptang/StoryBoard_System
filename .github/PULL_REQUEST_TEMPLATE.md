## FRAMEFORGE change contract

### Scope
- Capability / slice:
- Current authoritative owner:
- Target authoritative owner:
- Real consumer affected:

### Migration state
- Before:
- After:
- Evidence for the state:

### Verification
- [ ] Targeted unit / contract tests
- [ ] Integration tests
- [ ] Typecheck / build
- [ ] Real consumer / runtime verification
- [ ] Browser QA for visible UI changes
- [ ] 1440 / 1024 / 768 / 375 / 320 checked where supported
- [ ] Keyboard / focus / overlay / reduced-motion checked where applicable
- [ ] PostgreSQL / Alembic gate when persistence changes
- [ ] OpenAPI compatibility gate when API changes

### Regression / parity
- [ ] Golden Baseline capability was not silently removed
- [ ] PRODUCT / SCREEN / API / UI parity ledger updated when needed
- [ ] ACTIVE_WORKSTREAMS / CANONICAL_OWNER_MATRIX updated when state changed
- [ ] No mock or placeholder consumer is counted as integration
- [ ] No temporary patch/debug artifact is included

### Deletion / retirement
List every deleted or retired owner and the evidence that it has zero consumers. Write `none` if not applicable.

### Data / production safety
- [ ] No production mutation
- [ ] No real user data used as a disposable fixture
- [ ] Rollback / recovery impact described when persistence changes

### Visual evidence
For UI changes, link Actions screenshots/artifacts and list remaining `BLOCKED_VISUAL` items.

### Rollback
Describe the safe rollback boundary for this PR.
