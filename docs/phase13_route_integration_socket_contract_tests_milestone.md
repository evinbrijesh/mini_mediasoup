# Phase 13 — Route Integration + Socket Contract Test Expansion

## Scope
- Add integration tests for real policy/session route handlers through app-factory style dependency injection
- Add contract/regression tests for waiting-room socket payload shapes
- Ensure role-guard route behavior is verifiable with mocked dependencies

## Checklist
- [x] Refactor policy routes into injectable builder (`buildPolicyRoutes`)
- [x] Refactor session routes into injectable builder (`buildSessionRoutes`)
- [x] Add policy route integration tests (401/403/200)
- [x] Add session route integration tests (401/403/200)
- [x] Add waiting-room payload contract module (`waitingRoomContract.ts`)
- [x] Add waiting-room contract tests (queue sort + allow/deny payloads)
- [x] Wire socket waiting-room events to contract module
- [x] Stabilize test environment with required JWT secret in test script

## Test Coverage Added
- `routes/policyRoutes.integration.test.ts`
- `routes/sessionRoutes.integration.test.ts`
- `domain/waitingRoomContract.test.ts`

## Validation
- Server tests: `npm test` in `server/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
