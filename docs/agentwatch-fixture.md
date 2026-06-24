# agentwatch fixture repo

Use [beejak/agentwatch](https://github.com/beejak/agentwatch) (WatchTower) as a **sandbox** for pr-steward — seed PR scenarios there without touching pr-steward's own `main`.

WatchTower observes multi-agent systems; pr-steward **acts** on PRs. They stay decoupled: no WatchTower library import in this repo.

## Why agentwatch

| Benefit | Detail |
|---------|--------|
| Safe experiments | Close bot PRs, warn on overlaps, test duplicates |
| Real GitHub API | Exercises labels, comments, and close — not mocks |
| Agent stack alignment | WatchTower already uses DeepSeek for verdict LLM; pr-steward can use the same API for C6 triage |

## One-time setup

### 1. PAT for cross-repo apply

`GITHUB_TOKEN` in the pr-steward workflow only has write access to **pr-steward**. To run against agentwatch, add a repository secret:

| Secret | Scope | Purpose |
|--------|-------|---------|
| `AGENTWATCH_TOKEN` | `repo` on `beejak/agentwatch` | Close/warn PRs in the fixture repo |

Create a fine-grained PAT (or classic PAT) with **pull requests: read/write** and **issues: read/write** on `agentwatch`.

### 2. DeepSeek API (recommended for triage)

| Secret | Purpose |
|--------|---------|
| `DEEPSEEK_API_KEY` | C6 agent triage via OpenAI-compatible chat API |

Optional repo variables (defaults shown):

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PR_STEWARD_TRIAGE_PROVIDER=auto   # deepseek → cursor → heuristic
```

`auto` tries DeepSeek first when `DEEPSEEK_API_KEY` is set — same provider family as WatchTower's verdict judge.

### 3. Cursor SDK (optional)

| Secret | Purpose |
|--------|---------|
| `CURSOR_API_KEY` | Cloud agent triage with repo context via `@cursor/sdk` |

Only needed if you prefer Cursor over DeepSeek. In `auto` mode, DeepSeek wins when both keys exist.

## Run against agentwatch

**GitHub Actions → PR Lifecycle → Run workflow**

| Input | Value |
|-------|-------|
| `target_repo` | `beejak/agentwatch` |
| `triage_provider` | `deepseek` (or `auto`) |

Scheduled cron runs still target **pr-steward** only (`github.repository`).

## Seed test scenarios in agentwatch

Create open PRs to exercise rules (policy is still read from pr-steward checkout; rollout is `bot-only`):

| Scenario | How to seed | Expected rule |
|----------|-------------|---------------|
| Stale bot CI failure | Bot PR, failing checks, 7+ days idle | B3 close |
| Duplicate issue | Two PRs with `Closes #N` | C2 close on newer |
| Dependabot superseded | Two lodash bumps, older has conflicts | C3 close on older |
| Human overlap | Human PR touching files merged in another PR | C6 triage → warn in bot-only |
| Stale human | Human PR, 30+ days idle | A3 warn |

After merging a PR that touches `lib/foo.ts`, open a human PR that only edits `lib/foo.ts` to trigger C6.

## Local dry-run against agentwatch

```bash
export GITHUB_TOKEN=ghp_...          # PAT with agentwatch scope
export PR_STEWARD_TARGET_REPO=beejak/agentwatch
export DEEPSEEK_API_KEY=sk-...
export PR_STEWARD_TRIAGE_PROVIDER=deepseek

npm run pr-lifecycle:run
```

Report is written to `pr-lifecycle-report.json`.

## What is not integrated

- WatchTower Chronicle / Redis / ClickHouse ingestion
- agentwatch-firewall enforcement layer
- Branch deletion after close

Future optional step: emit OpenTelemetry or Langfuse spans from `triagePullRequest()` for WatchTower to correlate — still no Python dependency in pr-steward.

## Triage provider matrix

| Provider | API | Repo context |
|----------|-----|--------------|
| `deepseek` | DeepSeek chat completions (JSON mode) | Prompt only (file lists + merged PR metadata) |
| `cursor` | `@cursor/sdk` `Agent.prompt` | Cloud repo clone |
| `heuristic` | None | File overlap ratio |
| `auto` | DeepSeek → Cursor → heuristic | Best available |

All LLM verdicts pass through the **0.9 confidence gate** and **rollout mode** (human closes downgraded to warn in `bot-only`).
