# Phase 8 — Durable Role Recovery Across Restarts

## Scope
- Persist room runtime user roles for restart-safe authorization
- Keep REST moderator checks functional after server restart
- Reconcile runtime + persisted role source

## Checklist
- [x] Extend peer model with `userId` for role persistence linkage
- [x] Add durable room role table bootstrap (`room_runtime_roles`)
- [x] Persist role on join (`host/cohost/participant`)
- [x] Persist role updates on co-host assignment and host transfer
- [x] Remove durable role on final disconnect for user in room
- [x] Upgrade `canUserModerateRoom` to fallback to persisted role when runtime map is empty
- [x] Keep room-protected policy/session REST endpoints using role checks

## Data Model Additions
- `room_runtime_roles`
  - `room_id`
  - `user_id`
  - `role`
  - `updated_at`

## Authorization Behavior
- Primary: in-memory runtime role map
- Fallback: persisted `room_runtime_roles`
- Result: moderator API access can survive socket/runtime rebuild after restart when role row exists

## Validation
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
- Manual checks:
  - Assign co-host, restart server, verify moderator endpoints still authorize that user
  - Reconnect and verify role updates continue to sync
