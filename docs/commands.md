# Commands reference

Prefer **Makefile targets** over raw npm scripts (see [AGENTS.md](../AGENTS.md)).

## Make targets

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


## npm scripts

| Script | Command |
|--------|---------|
| `npm run build` | `tsc -p tsconfig.json` |
| `npm run check` | `npm run build && npm run lint` |
| `npm run lint` | `tsc -p tsconfig.json --noEmit` |
| `npm run test` | `vitest run` |
| `npm run test:watch` | `vitest` |
| `npm run pr-lifecycle:dry-run` | `node --import tsx src/cli/dry-run.ts` |
| `npm run pr-lifecycle:run` | `node --import tsx src/cli/run.ts` |
| `npm run docs:curate` | `node --import tsx src/cli/curate-docs.ts` |
| `npm run security:scan` | `make security-scan` |


## CLI entrypoints

| Command | Purpose |
|---------|---------|
| `npm run pr-lifecycle:dry-run` | Evaluate built-in sample PRs locally |
| `npm run pr-lifecycle:run` | Evaluate open PRs via GitHub API; writes `pr-lifecycle-report.json` |
| `npm run docs:curate` | Regenerate documentation from repo snapshot |

### pr-lifecycle:run environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` / `GH_TOKEN` | Yes | PAT or Actions token with PR write (CI) |
| `PR_STEWARD_TARGET_REPO` | No | `owner/repo` override (default: `beejak/pr-steward`) |
| `PR_STEWARD_TRIAGE_PROVIDER` | No | `auto` \| `deepseek` \| `cursor` \| `heuristic` |
| `DEEPSEEK_API_KEY` | No | Agent triage via DeepSeek |
| `CURSOR_API_KEY` | No | Agent triage via Cursor SDK |

### docs:curate flags

```bash
npm run docs:curate -- [--dry-run] [--agent] [--context-only]
```

| Flag | Effect |
|------|--------|
| `--dry-run` | Print paths that would be written |
| `--agent` | Use DeepSeek to polish README (requires `DEEPSEEK_API_KEY`) |
| `--context-only` | Write `docs/.curator-context.json` only |

## Typical workflows

```bash
# Local development
make install && make check && make test

# Policy tuning (no API writes in dry-run mode)
make pr-lifecycle-dry-run

# Live evaluation (respects policy rollout mode: bot-only)
GITHUB_TOKEN=ghp_... make pr-lifecycle-run

# Regenerate docs
make docs-curate
```

---
_Context: 2026-06-27T05:07:29.748Z_
