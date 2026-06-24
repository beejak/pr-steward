#!/usr/bin/env bash
# Cursor hook: run pre-commit on git commit attempts.
set -euo pipefail

input=$(cat)
command=$(echo "$input" | jq -r '.command // empty' 2>/dev/null || true)

if [[ -z "$command" ]]; then
  echo '{"permission":"allow"}'
  exit 0
fi

if echo "$command" | grep -qE 'git\s+commit'; then
  if command -v pre-commit >/dev/null 2>&1; then
    if ! pre-commit run --all-files 2>&1; then
      echo '{"permission":"deny","user_message":"pre-commit failed. Fix issues before committing.","agent_message":"Run: pre-commit run --all-files"}'
      exit 0
    fi
  fi
fi

echo '{"permission":"allow"}'
exit 0
