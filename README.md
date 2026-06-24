# pr-steward

Hybrid multi-platform PR lifecycle automation (close, warn, security signals)

**Rollout mode:** `bot-only` (from `policy/pr-lifecycle.yml`)

pr-steward is hybrid PR lifecycle automation for GitHub (and GitLab scaffold). Deterministic rules close or warn on stale, superseded, duplicate, and CI-blocked pull requests. Optional agent triage handles ambiguous human overlap (rule C6) — never the sole authority to close human PRs.

## Quick start

```bash
npm install
make verify-harness
make test
make check
make pr-lifecycle-dry-run    # local sample PRs, no API
# GITHUB_TOKEN=... make pr-lifecycle-run   # live repo (respects rollout mode)
```

### Pre-commit (Tier 1 security)

```bash
pip install pre-commit
pre-commit install
```

Cursor hooks in `.cursor/hooks.json` scan file edits for secrets and run pre-commit on `git commit`.

## What it does

| Capability | Detail |
|------------|--------|
| **Close bot PRs** | CI failures, superseded Dependabot bumps, duplicate issues, stale security findings (in `bot-only` / `full`) |
| **Warn human PRs** | Stale, security review, ambiguous superseded (C6 triage → warn in `bot-only`) |
| **Agent triage** | DeepSeek (preferred) → Cursor SDK (optional) → heuristic fallback for C6 |
| **Policy-driven** | Thresholds, exemptions, rollout in `policy/pr-lifecycle.yml` |
| **Tiered security** | Block secrets locally; flag SAST in CI; lifecycle labels for findings |

## What it does **not** do

See [docs/what-we-dont-do.md](docs/what-we-dont-do.md). In short: pr-steward **closes pull requests** (labels/comments) — it does **not** delete branches, purge files, or revert merged code.

## Architecture

See [docs/architecture.md](docs/architecture.md) for components, data flow, and mermaid diagrams.

| Layer | Path |
|-------|------|
| Policy | `policy/pr-lifecycle.yml` |
| Rule engine | `src/engine/evaluate.ts` |
| Agent triage | `src/agent/` |
| Orchestrator | `src/runner/lifecycle.ts` |
| GitHub client | `src/platform/github/` |
| Docs curator | `src/curator/` |

## Commands

Full reference: [docs/commands.md](docs/commands.md)

| Target | Description |
|--------|-------------|
| `install` | Install Node dependencies |
| `check` | Typecheck + lint |
| `test` | Run tests |
| `security-scan` | Run local security scanners (gitleaks, semgrep if installed) |
| `pr-lifecycle-run` | Evaluate repo PRs via GitHub API (respects rollout mode) |
| `verify-harness` | Validate scaffold files and policy schema |
| `docs-curate` | Regenerate docs from repo snapshot (templates) |
| `docs-curate-agent` | Regenerate docs with optional DeepSeek polish |
| `help` | — |
| `lint` | — |
| `build` | — |
| `pr-lifecycle-dry-run` | — |


## Rollout modes

| Mode | Behavior |
|------|----------|
| `dry-run` | Evaluate only; no API writes |
| `bot-only` | **Current** — auto-close/warn bot PRs; human PRs warned only, never closed |
| `full` | All rules including human stale close (A3b) after grace period |

## Security tiers

1. **Local block** — pre-commit gitleaks + Cursor hooks on file edit
2. **CI flag** — Semgrep + CodeQL annotate PRs (non-blocking during rollout)
3. **Lifecycle** — bot PRs with persistent critical findings + inactivity may close; human PRs get `security:review-required` only

## Agent triage

See [docs/phase3-agent-triage.md](docs/phase3-agent-triage.md).

| Provider | When |
|----------|------|
| `deepseek` | `DEEPSEEK_API_KEY` set (preferred) |
| `cursor` | `CURSOR_API_KEY` + `@cursor/sdk` |
| `heuristic` | File-overlap fallback |
| `auto` | DeepSeek → Cursor → heuristic |

## agentwatch sandbox

Live fixture repo: [beejak/agentwatch](https://github.com/beejak/agentwatch). See [docs/agentwatch-fixture.md](docs/agentwatch-fixture.md).

## Help & troubleshooting

[docs/help.md](docs/help.md) — secrets, env vars, rollout FAQ, local vs CI.

## Documentation curation

Regenerate docs from repo facts:

```bash
make docs-curate              # templates (deterministic)
DEEPSEEK_API_KEY=... make docs-curate-agent   # optional LLM polish
```

Snapshot: `docs/.curator-context.json` (generated).

## More docs

- [AGENTS.md](AGENTS.md) — canonical agent instructions
- [docs/adr/0001-pr-lifecycle-architecture.md](docs/adr/0001-pr-lifecycle-architecture.md)
- [docs/phase3-agent-triage.md](docs/phase3-agent-triage.md)
- [docs/agentwatch-fixture.md](docs/agentwatch-fixture.md)

---
_Auto-curated sections sync with `make docs-curate`. Last context: 2026-06-24T06:21:53.669Z._
