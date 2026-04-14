.PHONY: help validate test typecheck build ai-check ci-local release-patch release-minor release-major

help:
	@printf "Targets:\n"
	@printf "  make validate   - server tests + server typecheck + client build + ai compile check\n"
	@printf "  make test       - server tests\n"
	@printf "  make typecheck  - server typecheck\n"
	@printf "  make build      - client build\n"
	@printf "  make ai-check   - ai-service python compile check\n"
	@printf "  make ci-local   - local CI parity runner\n"
	@printf "  make release-patch|release-minor|release-major - bump root semver + changelog heading\n"

test:
	cd server && npm test

typecheck:
	cd server && npm run -s tsc --noEmit

build:
	cd client && npm run build

ai-check:
	cd ai-service && python -m py_compile main.py rtp_receiver.py vad.py transcriber.py translator.py tts.py

validate: test typecheck build ai-check

ci-local:
	bash scripts/ci-local.sh

release-patch:
	bash scripts/release-version.sh patch

release-minor:
	bash scripts/release-version.sh minor

release-major:
	bash scripts/release-version.sh major
