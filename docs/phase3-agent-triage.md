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
| `cursor` | `CURSOR_API_KEY` set and SDK returns valid JSON |
| `heuristic` | Fallback — file overlap ratio on merged PRs |

## Configuration

```bash
# CI / local apply (optional — heuristic works without it)
CURSOR_API_KEY=...
GITHUB_REPOSITORY=owner/repo
```

Add `CURSOR_API_KEY` as a GitHub Actions repository secret to enable cloud agent triage in the scheduled workflow.

## Not in scope

- Branch deletion after close
- Repository file purging
- Replacing deterministic bot-only closes
