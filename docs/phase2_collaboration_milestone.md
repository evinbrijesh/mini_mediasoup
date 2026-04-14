# Phase 2 — Collaboration & Moderation Milestone

## Scope
- Host role lifecycle and reassignment
- Participant moderation controls (mute/remove)
- Active speaker visual highlight
- Layout modes: grid / spotlight / sidebar

## Checklist
- [x] Add host role field to peer model
- [x] Assign first peer as host, auto-reassign on host leave
- [x] Emit host changes (`host-changed`)
- [x] Add host-only moderation events (`moderation:mute-peer`, `moderation:remove-peer`)
- [x] Add forced mute and removal client handlers
- [x] Sync peer media state through signaling
- [x] Add participant role labels in People panel
- [x] Add host moderation actions in People panel
- [x] Add tile pinning controls
- [x] Add layout mode cycling (grid/spotlight/sidebar)
- [x] Add active speaker detection and tile highlight

## Out of Scope
- Granular permission matrix (co-host, presenter roles)
- Server-enforced hard mute at transport/producers layer
- Advanced active speaker ranking with router audio levels
- Recording / live streaming / breakout rooms

## Validation
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Client build: `npm run build` in `client/`
- Manual checks:
  - Host badge moves to next participant when host leaves
  - Host can mute/remove another participant
  - Removed participant exits meeting view
  - Layout switch cycles through grid/spotlight/sidebar
  - Speaking participant gets highlighted
