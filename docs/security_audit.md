# mini_mediasoup — Security & Reliability Audit

Date: 2026-04-14

This document consolidates all issues and errors found across server, client, AI service, and Docker infrastructure.

## Summary

| Severity | Count |
|---|---:|
| Critical (runtime/config) | 9 |
| Critical (security) | 7 |
| High | 18 |
| Medium (logic/config) | 23 |
| Medium (security) | 8 |
| Low | 16 |
| **Total** | **81** |

---

## Critical — Runtime / Configuration

- **[C1]** `ai-service/main.py` — `app` is never defined (`@app.on_event`, `@app.get`) causing immediate `NameError`.
- **[C2]** `ai-service/main.py` — Missing imports for `FastAPI`, `uvicorn`, `VADProcessor`, `RTPReceiver`, `Transcriber`.
- **[C3]** Missing Dockerfiles for `server/`, `client/`, and `ai-service/` while compose uses `build:`.
- **[C4]** `docker-compose.yml` does not pass `JWT_SECRET`, `MEDIASOUP_ANNOUNCED_IP`, `MEDIASOUP_MIN_PORT`, `MEDIASOUP_MAX_PORT` to server.
- **[C5]** `client/vite.config.ts` missing `host: '0.0.0.0'`; client is inaccessible in Docker.
- **[C6]** `server/src/socketHandlers.ts` `connect-transport` can crash before `join-room` (null/undefined `peer`).
- **[C7]** `server/src/socketHandlers.ts` `get-producers` can crash before `join-room` (null/undefined `room`).
- **[C8]** `ai-service/main.py` hardcodes `http://localhost:3000`; fails in container networking.
- **[C9]** `ai-service/main.py` uses hardcoded `peerId: 'placeholder'` (incorrect attribution).

## Critical — Security

- **[S1]** No Socket.IO authentication; `authMiddleware` exists but is never applied.
- **[S2]** Transcript spoofing: client-controlled `peerId` is trusted and rebroadcast.
- **[S3]** Unbounded room creation; no rate limits, room caps, or TTLs (DoS risk).
- **[S4]** CORS is fully open (`origin: '*'`) for HTTP and Socket.IO.
- **[S5]** Postgres and Redis ports exposed to host (`5432`, `6379`).
- **[S6]** Redis has no authentication/password.
- **[S7]** JWT stored but never used in requests/socket auth; auth path is effectively bypassed.

---

## High

- **[H1]** `ChatSidebar.tsx` own-message detection compares sender name to `'You'` (always wrong in current flow).
- **[H2]** Local `videoStream` and `audioStream` both point to same `MediaStream`, causing state/control coupling.
- **[H3]** `useLocalMedia.ts` track toggles do not synchronize store state.
- **[H4]** `useMediasoup.ts` event listeners added in `joinRoom` are not cleaned up (duplicate listeners on rejoin).
- **[H5]** Leave flow uses `window.location.reload()` instead of proper teardown.
- **[H6]** No socket reconnection/rejoin strategy.
- **[H7]** `Peer.close()` closes transports only; producers/consumers not explicitly closed.
- **[H8]** Room deletion path has race potential on disconnect/rejoin timing.
- **[H9]** Room router not explicitly closed when room is deleted.
- **[H10]** VAD expects 16k PCM while mediasoup path provides 48k/encoded RTP payload semantics.
- **[H11]** RTP receiver buffer size fixed at 2048; packet truncation risk.
- **[H12]** RTP parsing assumes fixed 12-byte header; ignores CSRC/extensions.
- **[H13]** Lobby mic/cam toggles are cosmetic and not applied to actual join media constraints.
- **[H14]** Sequential produce flow can drop audio if video produce fails first.
- **[H15]** Dead `prisma` import in `socketHandlers.ts` initializes DB machinery unnecessarily.
- **[H16]** Dead `prisma` import in `auth.ts`.
- **[H17]** `redis` dependency/service present but unused by server code.
- **[H18]** `puppeteer` is in client production deps (huge artifact, wrong scope).

---

## Medium — Logic / Configuration / Architecture

- **[M1]** Mediasoup port range mismatch across `.env.example`, code defaults, and compose mappings.
- **[M2]** `.env.example` uses `localhost` in `DATABASE_URL`, conflicting with Docker service addressing.
- **[M3]** Server tsconfig includes `jsx: react-jsx` (irrelevant for Node backend).
- **[M4]** Server tsconfig `types: []` can suppress expected ambient typings.
- **[M5]** Strict TS options and current code patterns are misaligned (compile fragility).
- **[M6]** Prisma schema persists only `User`; no room/meeting/message/participant models.
- **[M7]** mediasoup worker death exits whole process instead of worker replacement strategy.
- **[M8]** No graceful shutdown handlers for server/workers/transports.
- **[M9]** WebRtcTransport lacks bitrate/congestion configuration.
- **[M10]** No simulcast encodings in produce path.
- **[M11]** No room-level authorization checks before consuming producer IDs.
- **[M12]** Chat message IDs use short `Math.random` strings (collision-prone).
- **[M13]** `App.tsx` user/auth responses typed as `any` (weak type safety).
- **[M14]** Token in localStorage and no session restore logic after refresh.
- **[M15]** No route-based room navigation/shareable links.
- **[M16]** Busy-wait/poll loop for recv transport readiness in consume flow.
- **[M17]** AI emits `transcript-from-ai`, but server/client handlers are missing.
- **[M18]** `translator.py` and `tts.py` are not integrated into runtime flow.
- **[M19]** No health/readiness endpoints.
- **[M20]** No restart policies in compose services.
- **[M21]** No compose healthchecks; `depends_on` does not guarantee readiness.
- **[M22]** AI service lacks dependency manifest (`requirements.txt`/`pyproject.toml`).
- **[M23]** Heavy/incorrect dependency partitioning (e.g., puppeteer in runtime deps).

## Medium — Security

- **[SM1]** No input validation for auth payloads (`email`, `name`, `password`).
- **[SM2]** No rate limiting on auth endpoints.
- **[SM3]** Raw internal error messages (`error.message`) are returned to clients.
- **[SM4]** Long-lived JWTs without refresh/invalidation strategy.
- **[SM5]** DeepL `auth_key` transmitted as URL/form parameter (key leakage risk in logs).
- **[SM6]** AI RTP receiver listens on `0.0.0.0` without authentication.
- **[SM7]** No HTTPS/TLS termination in current server setup.
- **[SM8]** Missing standard security headers (`helmet` not used).

---

## Low

- **[L1]** `server/compile_errors.txt` committed; should be ignored.
- **[L2]** Ad-hoc test files exist without framework integration (`test3.js`, `test_ports_exhaustion.js`, `frontend_test.js`).
- **[L3]** Useful strict TS lint-like options are commented out.
- **[L4]** Prisma CLI in production dependencies instead of dev dependencies.
- **[L5]** Missing `@types/bcryptjs` for server TypeScript.
- **[L6]** Hardcoded room code in controls bar.
- **[L7]** “Meeting host” label hardcoded for all participants.
- **[L8]** Hardcoded ElevenLabs voice ID.
- **[L9]** Hardcoded Whisper model/device defaults (not env-configurable).
- **[L10]** Deprecated compose `version: '3.8'` key.
- **[L11]** Missing `.dockerignore` files.
- **[L12]** Missing server ESLint config and shared formatting config.
- **[L13]** No CI/CD pipeline configuration.
- **[L14]** No structured logging framework.
- **[L15]** No structured error contract/correlation IDs.
- **[L16]** Server tsconfig includes client-oriented JSX option.

---

## Priority Fix Order (recommended)

1. **Platform bootability:** add Dockerfiles, correct compose env wiring, Vite host config.
2. **Security baseline:** Socket auth, transcript spoofing fix, CORS restrictions, rate limits, Redis hardening.
3. **Call stability:** null guards, graceful leave/cleanup, worker/router lifecycle handling, reconnection.
4. **AI pipeline correctness:** fix FastAPI app/bootstrap/imports, RTP decode/parsing assumptions, event integration.
5. **Quality hardening:** data model expansion, healthchecks/observability, dependency cleanup, CI/tests.
