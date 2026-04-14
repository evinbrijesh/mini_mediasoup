# Phase 5 — Policy Persistence, Audit, and Templates

## Scope
- Persist room access policy state to database
- Add policy audit log persistence
- Add reusable per-user policy templates

## Checklist
- [x] Add server policy store module (`policyStore.ts`) with table bootstrap
- [x] Persist room policy updates on lock/waiting/preset changes
- [x] Load persisted policy when room is first created in memory
- [x] Persist policy audit entries for moderation policy actions
- [x] Add policy template CRUD API routes
- [x] Add apply-template endpoint for room policy
- [x] Add room audit query endpoint
- [x] Add Safety panel UI for template save/apply/delete
- [x] Add Safety panel UI for policy audit log display

## API Surface Added
- `GET /api/policies/templates`
- `POST /api/policies/templates`
- `DELETE /api/policies/templates/:id`
- `POST /api/policies/rooms/:roomId/apply-template`
- `GET /api/policies/rooms/:roomId/audits?limit=20`

## Notes
- Tables are created on server boot via `initPolicyStore()`.
- Current persistence uses direct SQL through `pg` pool for fast iteration.
- This phase persists policy data; active room/peer media state remains in-memory.

## Validation
- Client build: `npm run build` in `client/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Manual checks:
  - Save template from safety panel, reload page, template remains
  - Apply template updates room policy behavior
  - Audit entries appear after policy actions
