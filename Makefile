.PHONY: help install check test lint build security-scan pr-lifecycle-dry-run verify-harness

help:
	@echo "Targets:"
	@echo "  install              Install Node dependencies"
	@echo "  check                Typecheck + lint"
	@echo "  test                 Run tests"
	@echo "  security-scan        Run local security scanners (gitleaks, semgrep if installed)"
	@echo "  pr-lifecycle-dry-run Evaluate PR lifecycle policy (no writes)"
	@echo "  verify-harness       Validate scaffold files and policy schema"

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

verify-harness:
	bash scripts/verify-harness.sh
