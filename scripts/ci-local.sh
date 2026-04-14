#!/usr/bin/env bash
set -euo pipefail

echo "[ci-local] Running server tests"
(cd server && npm test)

echo "[ci-local] Running server typecheck"
(cd server && npm run -s tsc --noEmit)

echo "[ci-local] Building client"
(cd client && npm run build)

echo "[ci-local] Running ai-service compile check"
(cd ai-service && python -m py_compile main.py rtp_receiver.py vad.py transcriber.py translator.py tts.py)

echo "[ci-local] ✅ all checks passed"
