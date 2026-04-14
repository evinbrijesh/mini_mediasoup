# Phase 14 — E2E Smoke Workflow Model Tests

## Scope
- Add deterministic smoke-workflow tests for core meeting flow sequencing
- Cover policy transitions and waiting-room admit/deny behavior in one model
- Validate moderation escalation path (host -> co-host)

## Checklist
- [x] Add smoke workflow domain model (`smokeWorkflowModel.ts`)
- [x] Add deterministic fixtures (`testFixtures.ts`)
- [x] Add workflow smoke tests:
  - [x] first user becomes host
  - [x] controlled policy queues guest then admit -> join
  - [x] strict policy denies new join
  - [x] co-host assignment enables moderation capability
- [x] Keep existing integration/regression tests green

## Test Design
- Domain-state simulation for deterministic flow validation.
- Complements route integration tests and policy contract tests from prior phases.

## Validation
- Server tests: `npm test` in `server/` (27 passing)
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
