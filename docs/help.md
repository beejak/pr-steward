# Help & troubleshooting

## FAQ

### Which rollout mode is active?

**`bot-only`** — read from `policy/pr-lifecycle.yml` → `rollout.mode`. Change policy before changing closure behavior in code.

### Will pr-steward delete my branches or files?

No. It closes pull requests and may add labels/comments. Branches remain unless you delete them or use GitHub's "delete branch on merge" setting. See [what-we-dont-do.md](what-we-dont-do.md).

### Can I run apply (close/warn) from my laptop?

Technically yes with `make pr-lifecycle-run` and a write-scoped token, but **AGENTS.md** recommends apply only in CI. Local runs should use `dry-run` policy or the dry-run CLI.

### How do I test against a sandbox repo?

Use [agentwatch-fixture.md](agentwatch-fixture.md): workflow dispatch with `target_repo: beejak/agentwatch` and `AGENTWATCH_TOKEN` secret.

### When can we switch to `full` rollout on pr-steward?

See [production-rollout.md](production-rollout.md) — weekly monitoring on `beejak/pr-steward` in `bot-only`, checklist (2 weeks clean runs, zero reopens, team sign-off), and rollback steps. agentwatch is sandbox only.

### Agent triage returns heuristic only

1. Set `DEEPSEEK_API_KEY` (preferred) or `CURSOR_API_KEY`
2. Set `PR_STEWARD_TRIAGE_PROVIDER=deepseek` to force provider
3. Check API errors in CI logs (failures fall back to heuristic)

## Environment variables

From `.env.example`:

- `GITHUB_TOKEN is provided automatically in GitHub Actions`
- `AGENTWATCH_TOKEN`
- `PR_STEWARD_TARGET_REPO`
- `PR_STEWARD_TRIAGE_PROVIDER`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`
- `CURSOR_API_KEY`
- `GITLAB_TOKEN`

Copy `.env.example` → `.env` for local use (never commit secrets).

## Secrets for CI

| Secret | Workflow | Purpose |
|--------|----------|---------|
| `GITHUB_TOKEN` | PR Lifecycle | Auto-provided; write on same repo |
| `AGENTWATCH_TOKEN` | PR Lifecycle | Cross-repo PAT for `beejak/agentwatch` |
| `DEEPSEEK_API_KEY` | PR Lifecycle | C6 triage |
| `CURSOR_API_KEY` | PR Lifecycle | Optional Cursor triage |

## Rollout mode reference

| Mode | Bot close | Human close | Human warn |
|------|-----------|-------------|------------|
| `dry-run` | Simulated | Simulated | Simulated |
| `bot-only` | Applied | Never | Applied |
| `full` | Applied | After stale grace | Applied |

## Rule quick reference

| Rule | Typical action | Notes |
|------|----------------|-------|
| E1 | skip | Exemption labels |
| A2 | close (bot) | Stale draft bots |
| B3 | close | CI/conflict + inactive |
| C3 | close (bot) | Superseded Dependabot |
| G2 | close (bot) | Security + inactive |
| G3 | warn | Human security |
| A3 | warn | Human stale |
| C6 | agent_review | Ambiguous human overlap |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No PRs evaluated | Token scope; repo has open PRs |
| All SKIPPED | Rollout `dry-run` or `shouldApplyAction` blocked human close |
| Harness fails | `make verify-harness` — missing scaffold files |
| Type errors | `make check` |

## Getting help

- Policy changes: edit `policy/pr-lifecycle.yml` first
- Agent boundaries: [AGENTS.md](../AGENTS.md)
- Architecture: [architecture.md](architecture.md)

---
_Context: 2026-06-27T07:56:32.283Z_
