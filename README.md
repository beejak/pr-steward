# pr-steward

Hybrid multi-platform PR lifecycle automation: deterministic close/warn rules in CI, optional agent triage, and tiered security scanning.

## Quick start

```bash
npm install
make verify-harness
make check
make pr-lifecycle-dry-run
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
| `policy/pr-lifecycle.yml` | Thresholds, exemptions, rule IDs |
| `src/engine/` | Rule evaluation (TypeScript) |
| `.github/workflows/` | Security scans + scheduled lifecycle |
| `.cursor/hooks/` | Dev-time secret blocking |

## Rollout modes

- `dry-run` — evaluate only, no API writes (default)
- `bot-only` — auto-close bot PRs matching safe rules
- `full` — all rules after tuning period

## Docs

- [AGENTS.md](AGENTS.md) — canonical agent instructions
- [docs/adr/0001-pr-lifecycle-architecture.md](docs/adr/0001-pr-lifecycle-architecture.md)
