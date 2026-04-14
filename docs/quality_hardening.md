# Quality Hardening Changes (Priority 5)

This document records the quality hardening work applied in Priority 5.

## 1) Data model expansion

Updated `server/prisma/schema.prisma`:
- Added `Room`
- Added `MeetingParticipant`
- Added `Message`
- Connected relations to `User`

This establishes persistence structures for rooms, participants, and chat history.

## 2) Healthchecks and readiness

Added `server/src/routes/healthRoutes.ts`:
- `GET /health/live`
- `GET /health/ready`

Mounted in `server/src/index.ts`.

## 3) Docker operational hardening

Updated `docker-compose.yml`:
- Added healthchecks for `postgres`, `redis`, `server`, `client`
- Changed dependencies to `depends_on.condition: service_healthy`
- Added `restart: unless-stopped` to all active services

## 4) Dependency cleanup

### server/package.json
- Removed unused runtime deps: `redis`, `uuid`
- Moved `prisma` from dependencies to devDependencies
- Removed unused `@types/uuid`

### client/package.json
- Moved `puppeteer` from dependencies to devDependencies

## 5) CI baseline

Added `.github/workflows/ci.yml` with 3 jobs:
- `server`: `npm ci`, `tsc --noEmit`
- `client`: `npm ci`, `npm run build`
- `ai-service`: python syntax compile checks

## 6) Project context file

Added root `CLAUDE.md` with:
- stack summary
- structure
- conventions
- known gotchas
- module map
