# Phase 16 — Developer DX and Local CI Parity

## Scope
- One-command local validation workflow
- Root-level developer scripts for common checks
- Pre-commit hook script for local guardrails

## Checklist
- [x] Add root `Makefile` with validate/test/typecheck/build/ai-check targets
- [x] Add root `package.json` scripts for developer convenience
- [x] Add local CI parity runner script (`scripts/ci-local.sh`)
- [x] Add pre-commit hook script (`.githooks/pre-commit`)
- [x] Make scripts executable

## New Commands
- `make validate`
- `make ci-local`
- `npm run validate`
- `npm run ci:local`

## Hook Setup (one-time)
To enable repo-managed hooks:

```bash
git config core.hooksPath .githooks
```

Then every commit will run `make validate` via `.githooks/pre-commit`.

## Validation
- Run: `bash scripts/ci-local.sh`
- Expected: all server/client/ai checks pass locally
