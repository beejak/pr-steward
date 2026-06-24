#!/usr/bin/env bash
# Cursor hook: scan file edits for obvious secret patterns.
# Exit 0 = allow, 2 = block, other = fail open unless failClosed set.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // .tool_input.file_path // empty' 2>/dev/null || true)
content=$(echo "$input" | jq -r '.new_string // .tool_input.content // .tool_input.new_string // empty' 2>/dev/null || true)

if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.env|*.yaml|*.yml|*.json) ;;
  *) exit 0 ;;
esac

if [[ -z "$content" ]]; then
  exit 0
fi

patterns=(
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
  '(?i)(api[_-]?key|password|secret)\s*=\s*["'"'"'][^"'"'"']{8,}["'"'"']'
  '(?i)ghp_[a-zA-Z0-9]{20,}'
  '(?i)sk-[a-zA-Z0-9]{20,}'
)

for pattern in "${patterns[@]}"; do
  if echo "$content" | grep -qE "$pattern" 2>/dev/null; then
    echo "[security-check] Possible secret detected in $file_path. Use environment variables." >&2
    exit 2
  fi
done

exit 0
