# Phase 9 — Prisma Unification for Operational Data

## Scope
- Move operational data access from mixed raw SQL/pg pools to Prisma models
- Keep bootstrap table creation for smooth dev startup
- Consolidate policy/session/runtime-role reads/writes through Prisma client

## Checklist
- [x] Extend Prisma schema with operational models:
  - [x] `RoomPolicy`
  - [x] `RoomPolicyAudit`
  - [x] `RoomPolicyTemplate`
  - [x] `MeetingSession`
  - [x] `MeetingSessionParticipant`
  - [x] `MeetingSessionEvent`
  - [x] `RoomRuntimeRole`
- [x] Refactor `policyStore.ts` to Prisma CRUD/upsert APIs
- [x] Refactor `sessionStore.ts` to Prisma CRUD/upsert APIs
- [x] Preserve startup bootstrap behavior with `CREATE TABLE IF NOT EXISTS`
- [x] Keep role fallback authorization path compatible with persisted roles

## Architectural Result
- Single DB access layer technology for core app + operational telemetry: **Prisma**
- Reduced split-brain between Prisma-managed entities and pg raw pool entities
- Cleaner path for future typed repositories and migrations

## Validation
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
