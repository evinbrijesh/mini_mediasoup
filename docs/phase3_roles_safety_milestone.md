# Phase 3 — Roles, Safety, and Control Surface

## Scope
- Co-host role assignment model
- Host/co-host moderation permissions
- Room lock safety control
- Wire all visible control-bar buttons to concrete actions/panels

## Checklist
- [x] Add co-host flag to peer model
- [x] Add host-only co-host assignment signaling (`moderation:set-cohost`)
- [x] Broadcast peer role changes (`peer-role-changed`)
- [x] Extend moderation permission checks to host/co-host for mute/remove
- [x] Add room lock state to room model
- [x] Add room lock toggle signaling (`moderation:toggle-room-lock`)
- [x] Enforce room lock on join attempts
- [x] Wire control-bar buttons:
  - [x] More (opens More options panel)
  - [x] Layout (cycles grid/spotlight/sidebar)
  - [x] Info (meeting info panel + invite copy)
  - [x] Participants (participants panel)
  - [x] Chat (chat panel)
  - [x] Activity (activity panel)
  - [x] Safety (safety panel + room lock control)
  - [x] Leave (leave meeting)
- [x] Surface participant role labels (host/co-host/participant)
- [x] Add host control to grant/revoke co-host in participants panel

## Notes
- Current room lock model is in-memory and applies per running server process.
- Existing members are unaffected when room is locked; only new joins are blocked.

## Validation
- Client build: `npm run build` in `client/`
- Server typecheck: `npm run -s tsc --noEmit` in `server/`
- Manual checks:
  - Host grants co-host, co-host can mute/remove and lock room
  - Locked room rejects new join attempts
  - Each control-bar icon opens its intended action/panel
