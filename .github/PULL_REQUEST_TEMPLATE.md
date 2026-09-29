## FRAMEFORGE change summary

Describe the user-visible and architectural change. Do not use "done", "complete", "cut over", or "retired" unless the evidence below supports that state.

## Ownership

- Capability:
- Current runtime owner before this PR:
- Target/canonical owner:
- Render/DOM owner:
- State owner:
- Request owner:
- Mutation owner:
- Persistence owner:
- Legacy owner affected:

## Real consumer evidence

List the actual route/component/service/import that consumes the new path. A scaffold or isolated test is not a consumer.

## Product parity / Golden Baseline

- [ ] No Golden Baseline capability disappears silently.
- [ ] Any intentionally changed/removed behavior is explicitly documented.
- [ ] PRODUCT_PARITY_MATRIX / SCREEN_PARITY_MATRIX updated when relevant.
- [ ] No removed product mode/control has been reintroduced.

## API / persistence / conflict semantics

- [ ] Auth/permission contract preserved.
- [ ] Request/response/error contract verified.
- [ ] Revision / HTTP 409 behavior verified where applicable.
- [ ] No-op writes do not create fake revisions/audit events.
- [ ] Alembic migration added when models/schema changed.
- [ ] PostgreSQL rehearsal considered when persistence changed.

## UI QA

For visible UI work:

- [ ] 1440 px
- [ ] 1024 px
- [ ] 768 px
- [ ] 375 px
- [ ] 320 px where supported
- [ ] Keyboard/focus
- [ ] Overlay/dialog/menu layering and dismissal
- [ ] No unintended page-level overflow
- [ ] Reduced-motion behavior where motion changed
- [ ] Browser evidence or explicit blocker recorded

## AI / Presence safety

- [ ] AI remains zero-egress by default unless the user explicitly enabled a provider path.
- [ ] AI mutations still require human review and normal commands.
- [ ] Presence remains ephemeral and is not written to durable business tables.
- [ ] Realtime is not a second mutation system.

## Deletion / retirement

If files or owners were deleted:

- [ ] Static imports checked.
- [ ] Dynamic/string loaders checked.
- [ ] Build/deploy manifests checked.
- [ ] Tests/docs/runtime registrations checked.
- [ ] Old runtime consumer count is zero.
- [ ] Migration state and owner matrix updated.

## Verification

Commands/checks run:

```text
<insert focused tests/build/browser QA>
```

## Migration state

Before:
After:

Why this promotion is justified:

## Rollback / risk

Describe the rollback path and any data/runtime risk. Use "N/A" only when the change is genuinely reversible and stateless.
