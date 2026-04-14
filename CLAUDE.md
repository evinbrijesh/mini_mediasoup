# CLAUDE.md

## Stack
- **Server:** TypeScript, Node.js, Express, Socket.IO, mediasoup, Prisma (PostgreSQL)
- **Client:** React + Vite + TypeScript + Zustand + mediasoup-client
- **AI service:** Python, FastAPI, python-socketio, faster-whisper, webrtcvad
- **Infra:** Docker Compose, PostgreSQL, Redis

## Structure
- `server/` — signaling/API server, mediasoup SFU orchestration, auth
- `client/` — web meeting UI and mediasoup-client transport logic
- `ai-service/` — RTP ingest + transcription service
- `docs/` — audit and architecture/operations docs

## Conventions
- **Naming:** camelCase for variables/functions, PascalCase for classes/components
- **Errors:** return generic client-facing errors; log detailed server errors only
- **Logging:** use structured, contextual log messages for join/produce/consume lifecycle
- **Realtime auth:** all socket clients must authenticate via handshake token

## Known gotchas
- mediasoup announced IP must be configured (`MEDIASOUP_ANNOUNCED_IP`) or remote media fails.
- AI transcription path currently depends on explicit room mapping (`AI_ROOM_ID`).
- Room and media state are in-memory; restart drops active meeting state.

## Module map
- `server/src/index.ts` — app boot, middleware, socket auth, lifecycle hooks
- `server/src/socketHandlers.ts` — signaling event orchestration
- `server/src/Room.ts` / `Peer.ts` — media object ownership + cleanup boundaries
- `client/src/hooks/useMediasoup.ts` — transport lifecycle + consume/produce flow
- `client/src/hooks/useLocalMedia.ts` — local capture/screen/transcription controls
- `ai-service/main.py` — service entrypoint, socket bridge, RTP->transcript pipeline
