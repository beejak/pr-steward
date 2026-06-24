# pr-steward

Hybrid multi-platform PR lifecycle automation: deterministic close/warn rules in CI, optional agent triage, and tiered security scanning.

## Quick start

```bash
npm install
make verify-harness
make test
make check
make pr-lifecycle-dry-run   # local samples
# GITHUB_TOKEN=... make pr-lifecycle-run   # live repo (dry-run by default in policy)
```

### Pre-commit (Tier 1 security)

```bash
pip install pre-commit
pre-commit install
```

### Cursor

Project hooks in `.cursor/hooks.json` scan file edits for secrets and run pre-commit on `git commit`.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| `policy/pr-lifecycle.yml` | Thresholds, exemptions, rollout mode |
| `src/policy/load.ts` | YAML → `PolicyConfig` |
| `src/engine/evaluate.ts` | Rule evaluation |
| `src/runner/lifecycle.ts` | Orchestrator (respects dry-run / bot-only / full) |
| `src/platform/github/` | API client + normalizer |
| `tests/` | Vitest fixtures + rollout matrix |

## Rollout modes

- `dry-run` — evaluate only, no API writes (default during tuning)
- `bot-only` — **current** — auto-close/warn bot PRs only; human PRs get warns where allowed, never closes
- `full` — all rules including human stale close (A3b) after grace

## What pr-steward does *not* purge

pr-steward **closes pull requests** (and may add labels/comments). It does **not**:

- Delete files or folders from your repository
- Remove merged code from `main`
- Delete source branches after closing a PR (branches remain unless you delete them manually or use GitHub’s “delete branch on merge” setting)

Closing a stale Dependabot PR only removes it from the open-PR queue — it does not revert or purge anything already merged.

## What gets closed in `bot-only` mode

| Rule | Bot PR | Human PR |
|------|--------|----------|
| B3 CI/conflict + inactive | Close | Skip close |
| C1/C2/C3 superseded/duplicate | Close | Warn (C6) or skip |
| G2 security stale | Close | Warn only |
| A3 stale | N/A | Warn only |

## Docs

- [AGENTS.md](AGENTS.md) — canonical agent instructions
- [docs/adr/0001-pr-lifecycle-architecture.md](docs/adr/0001-pr-lifecycle-architecture.md)
