# Phase 6 — Durable Meeting Sessions & Recovery Metadata

## Scope
- Persist meeting session lifecycle metadata
- Persist participant join/leave timeline
- Persist key meeting events for diagnostics/review
- Expose session history APIs for room-level introspection

## Checklist
- [x] Add session store module (`sessionStore.ts`) with DB bootstrap
- [x] Add `meeting_sessions` table management
- [x] Add `meeting_session_participants` table management
- [x] Add `meeting_session_events` table management
- [x] Auto-close stale active sessions on server boot (restart marker)
- [x] Start room session when room is created in memory
- [x] Record participant joins/leaves
- [x] Record key events (chat, hand raise, media state, screen share start)
- [x] End session when room empties
- [x] Add REST endpoints for session summaries
- [x] Surface latest session summary in Safety panel

## API Surface Added
- `GET /api/sessions/active`
- `GET /api/sessions/rooms/:roomId/latest`

## Notes
- This phase stores durable metadata for operations and post-meeting review.
- It does **not** restore live mediasoup transports/media after restart.
- Recovery behavior: active sessions are marked ended with reason `server-restart` at boot.

## Validation
- Client build: `npm run build` in `client/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Manual checks:
  - Join/leave room and confirm session summary updates
  - Trigger chat/hand/media toggles and confirm event count increments
  - Restart server and verify previous active sessions get closed with restart reason
