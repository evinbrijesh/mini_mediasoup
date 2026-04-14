# Phase 1 — Meeting Core Hardening Milestone

## Scope
- Participant media-state synchronization (mic/camera)
- Pin/spotlight tile support
- Local tile rendering stability for camera off/on transitions
- Baseline participant indicators in People panel

## Checklist
- [x] Add server-side per-peer media state model (`isMuted`, `isVideoOff`)
- [x] Add signaling event to publish media-state changes (`set-media-state` -> `peer-media-state-changed`)
- [x] Include media state in initial producer discovery payload
- [x] Emit local media-state updates when user toggles mic/camera
- [x] Apply remote media-state updates in client store
- [x] Add tile pin/unpin action and persisted pinned tile id in meeting store
- [x] Render pin control on tiles
- [x] Prioritize pinned tile in grid ordering
- [x] Add camera status indicator in participants panel (video on/off icon)
- [x] Keep local video tile fallback stable when no renderable video track exists

## Out of Scope (Phase 2+)
- Active speaker detection and highlight
- Host moderation controls (mute others, disable cam)
- Breakout rooms
- Recording/live streaming
- Polls/reactions/whiteboard

## Validation Notes
- Typecheck server: `npm run -s tsc --noEmit` (server)
- Build client: `npm run build` (client)
- Manual checks:
  - Guest user can join by room code without login
  - Mic/cam toggles propagate across participants
  - Pin/unpin tile reorders grid
  - Screen share starts/stops without recursive stale producer behavior
