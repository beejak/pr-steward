#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

required=(
  AGENTS.md
  CLAUDE.md
  Makefile
  policy/pr-lifecycle.yml
  .pre-commit-config.yaml
  .cursor/hooks.json
  .cursor/hooks/security-check.sh
  security/semgrep/rules.yml
  vitest.config.ts
  src/policy/load.ts
  src/runner/lifecycle.ts
  src/platform/github/client.ts
  src/curator/context.ts
  src/cli/curate-docs.ts
)

missing=0
for f in "${required[@]}"; do
  if [[ ! -e "$f" ]]; then
    echo "MISSING: $f"
    missing=$((missing + 1))
  fi
done

if [[ $missing -gt 0 ]]; then
  echo "Harness verification failed ($missing missing files)"
  exit 1
fi

if ! grep -q 'version: 1' policy/pr-lifecycle.yml; then
  echo "Policy version missing"
  exit 1
fi

echo "Harness verification passed"
