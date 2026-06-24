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

- `dry-run` — evaluate only, no API writes (default)
- `bot-only` — auto-close bot PRs matching safe rules
- `full` — all rules after tuning period

## Docs

- [AGENTS.md](AGENTS.md) — canonical agent instructions
- [docs/adr/0001-pr-lifecycle-architecture.md](docs/adr/0001-pr-lifecycle-architecture.md)
