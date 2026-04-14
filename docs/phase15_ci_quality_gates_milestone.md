# Phase 15 — CI Quality Gates and Pipeline Hardening

## Scope
- Enforce stronger CI gates across server/client/ai-service
- Add matrix coverage for current supported Node runtimes
- Add fail-fast and concurrency controls
- Publish test coverage artifacts for server test runs

## Checklist
- [x] Add workflow concurrency guard (`cancel-in-progress`)
- [x] Add server Node matrix (`20`, `22`)
- [x] Add client Node matrix (`20`, `22`)
- [x] Expand server job gates:
  - [x] test
  - [x] typecheck
  - [x] V8 coverage collection
  - [x] coverage artifact upload
- [x] Keep client build gate
- [x] Keep ai-service syntax/compile gate
- [x] Add terminal `quality-gate` job depending on all jobs

## CI Workflow Updated
- `.github/workflows/ci.yml`

## Notes
- Server coverage currently uses Node V8 coverage output and artifact upload.
- The quality gate job gives a single final status marker for branch protections.
