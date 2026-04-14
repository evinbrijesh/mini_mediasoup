# Phase 12 — Integration + Regression Test Expansion

## Scope
- Add integration-style tests for role-guarded authorization flow
- Add regression tests for waiting-room/lock policy decision logic
- Keep route guards and policy behavior independently testable

## Checklist
- [x] Add policy decision engine module (`meetingPolicyEngine.ts`)
- [x] Add regression tests for join gate behavior:
  - [x] locked rooms deny join
  - [x] waiting room queues non-admitted participants
  - [x] admitted participants are allowed
- [x] Add preset-to-flags regression tests (`open/controlled/strict`)
- [x] Add integration-style authorization route test harness (ephemeral express/http)
- [x] Add integration tests for 401/403/200 guard outcomes
- [x] Wire socket policy logic to domain policy engine

## Test Inventory (Server)
- Unit tests:
  - `domain/meetingPolicyEngine.test.ts`
  - `repositories/policyRepository.test.ts`
  - `roomRuntimeRegistry.test.ts`
  - `routes/authorization.test.ts`
- Integration-style tests:
  - `routes/authorization.integration.test.ts`

## Validation
- Server tests: `npm test` in `server/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
