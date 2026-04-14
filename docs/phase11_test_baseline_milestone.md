# Phase 11 — Test Baseline for Repositories and Role Guards

## Scope
- Establish repeatable server test runner
- Add unit tests for repository contract logic and role-guard authorization flow
- Ensure role-guard behavior is testable independently of route wiring

## Checklist
- [x] Configure server test script using Node test runner via `tsx`
- [x] Add `PolicyRepository` unit tests for preset derivation behavior
- [x] Add runtime registry unit test for in-memory moderator role path
- [x] Extract route-level moderator authorization helper
- [x] Add authorization helper tests:
  - [x] unauthorized (401)
  - [x] forbidden (403)
  - [x] allowed
- [x] Refactor policy/session routes to use tested authorization helper

## Test Command
- `npm test` in `server/`

## Validation
- Server tests pass
- Server typecheck passes
- Client build remains green
