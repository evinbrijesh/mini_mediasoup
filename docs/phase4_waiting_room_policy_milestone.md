# Phase 4 — Waiting Room & Policy Presets

## Scope
- Waiting room queue and admit/deny flow
- Host/co-host policy presets for room access
- Safety panel controls for lock/waiting/presets

## Checklist
- [x] Add waiting-room state to room model (`waitingRoomEnabled`, `waitingQueue`, `admittedPeers`)
- [x] Block joins when room is locked
- [x] Route join requests to waiting queue when waiting room enabled
- [x] Add admit/deny signaling (`waiting-room:respond`)
- [x] Add waiting room queue broadcast (`waiting-room-updated`)
- [x] Add room policy preset signaling (`moderation:set-policy-preset`)
- [x] Add waiting-room toggle signaling (`moderation:toggle-waiting-room`)
- [x] Add room policy update broadcast (`room-policy-updated`)
- [x] Implement client waiting flow (`waitingStatus` + lobby message)
- [x] Implement host/co-host waiting queue actions in Safety panel
- [x] Implement policy preset controls in Safety panel

## Policy Presets
- **open**: unlocked + waiting room off
- **controlled**: unlocked + waiting room on
- **strict**: locked + waiting room on

## Validation
- Client build: `npm run build` in `client/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Manual checks:
  - With controlled preset, new joiners see waiting message until admitted
  - Host/co-host can admit/deny queue entries
  - With strict preset, direct join attempts are blocked by lock message
  - Safety panel reflects current lock/policy state
