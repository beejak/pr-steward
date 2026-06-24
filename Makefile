.PHONY: help install check test lint build security-scan pr-lifecycle-dry-run pr-lifecycle-run verify-harness docs-curate docs-curate-agent

help:
	@echo "Targets:"
	@echo "  install              Install Node dependencies"
	@echo "  check                Typecheck + lint"
	@echo "  test                 Run tests"
	@echo "  security-scan        Run local security scanners (gitleaks, semgrep if installed)"
	@echo "  pr-lifecycle-dry-run Evaluate sample PRs locally (no API)"
	@echo "  pr-lifecycle-run     Evaluate repo PRs via GitHub API (respects rollout mode)"
	@echo "  verify-harness       Validate scaffold files and policy schema"
	@echo "  docs-curate          Regenerate docs from repo snapshot (templates)"
	@echo "  docs-curate-agent    Regenerate docs with optional DeepSeek polish"

install:
	npm install

check: install
	npm run check

test: install
	npm test

lint: install
	npm run lint

build: install
	npm run build

security-scan:
	@command -v gitleaks >/dev/null 2>&1 && gitleaks detect --source . --redact --verbose || echo "gitleaks not installed — skip"
	@command -v semgrep >/dev/null 2>&1 && semgrep --config security/semgrep --error || echo "semgrep not installed — skip"

pr-lifecycle-dry-run: install
	npm run pr-lifecycle:dry-run

pr-lifecycle-run: install
	npm run pr-lifecycle:run

verify-harness:
	bash scripts/verify-harness.sh

docs-curate: install
	npm run docs:curate

docs-curate-agent: install
	npm run docs:curate -- --agent
