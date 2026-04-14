# Phase 7 — Role-Based API Auth Hardening

## Scope
- Enforce moderator role for sensitive REST operations
- Bridge socket runtime roles into API authorization decisions
- Keep guest users blocked from privileged policy/session APIs

## Checklist
- [x] Add in-memory runtime role registry (`roomRuntimeRegistry.ts`)
- [x] Register authenticated room participants with role on join
- [x] Update runtime role on co-host assignment and host transfer
- [x] Unregister runtime peer on disconnect/room exit
- [x] Protect policy apply endpoint with moderator role check
- [x] Protect policy audit endpoint with moderator role check
- [x] Protect room latest-session endpoint with moderator role check
- [x] Keep template CRUD endpoints authenticated (token required)

## Authorization Rules
- **Authenticated user** required for all policy/session REST endpoints.
- **Host or co-host in the target room runtime** required for:
  - `POST /api/policies/rooms/:roomId/apply-template`
  - `GET /api/policies/rooms/:roomId/audits`
  - `GET /api/sessions/rooms/:roomId/latest`

## Notes
- Runtime role checks rely on current in-memory room membership.
- If no active runtime membership for the user in room, protected room endpoints return 403.

## Validation
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
- Manual checks:
  - Participant (non-moderator) gets 403 on protected room policy/session endpoints
  - Host/co-host succeeds on protected endpoints
  - After role change to co-host, access is granted without restart
