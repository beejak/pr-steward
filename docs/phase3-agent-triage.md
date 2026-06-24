# Phase 3: Agent triage

Cursor SDK + heuristic fallback for `agent_review` queue (rule C6 — ambiguous superseded human PRs).

## Flow

1. `evaluatePullRequest` returns `agent_review` when a human PR overlaps merged work (bots use deterministic C1 close).
2. `LifecycleRunner` calls `triagePullRequest()` when `needsAgentTriage()` is true.
3. `mergeAgentVerdict()` maps agent output to `close` | `warn` | `skip` with a **0.9 confidence gate**.
4. `shouldApplyAction()` still enforces rollout: human closes only in `full` mode; `bot-only` warns only.

## Triage sources

| Source | When |
|--------|------|
| `deepseek` | `DEEPSEEK_API_KEY` set (OpenAI-compatible chat API, JSON mode) |
| `cursor` | `CURSOR_API_KEY` set and SDK returns valid JSON |
| `heuristic` | Fallback — file overlap ratio on merged PRs |

`auto` (default) tries DeepSeek, then Cursor, then heuristic.

## Configuration

```bash
DEEPSEEK_API_KEY=...
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL=deepseek-chat
# PR_STEWARD_TRIAGE_PROVIDER=auto

CURSOR_API_KEY=...   # optional
GITHUB_REPOSITORY=owner/repo
```

Add `DEEPSEEK_API_KEY` (and optionally `CURSOR_API_KEY`) as GitHub Actions repository secrets.

## Fixture repo testing

See [agentwatch-fixture.md](agentwatch-fixture.md) for running pr-steward against `beejak/agentwatch` via workflow dispatch.

## Not in scope

- Branch deletion after close
- Repository file purging
- Replacing deterministic bot-only closes
