# PR Lifecycle — Agent Instructions

Canonical instructions for all AI coding tools (Cursor, Claude Code, Codex, Copilot).

## Project purpose

Hybrid multi-platform PR lifecycle automation:

- **Deterministic rules** close or warn on stale, superseded, duplicate, and CI-blocked PRs
- **Agent triage** classifies ambiguous cases only (never sole authority to close human PRs)
- **Tiered security**: block secrets locally; flag SAST in CI; tie findings to labels/closure rules

## Commands

Always prefer Makefile targets over ad-hoc commands:

| Target | Purpose |
|--------|---------|
| `make check` | Typecheck before commit |
| `make security-scan` | Local gitleaks + semgrep |
| `make pr-lifecycle-dry-run` | Evaluate policy without API writes |
| `make verify-harness` | Validate scaffold integrity |

## Workflow (Superpowers-inspired)

1. **Brainstorm** — capture requirements in `docs/` or an issue before coding
2. **Plan** — break work into small tasks with file paths and acceptance criteria
3. **TDD** — write failing test, minimal implementation, refactor
4. **Review** — run `make check` and `make security-scan` before opening PR

## Boundaries

- Never hardcode secrets; use environment variables and document in `.env.example`
- Never auto-close human ready-for-review PRs without prior `stale` warning + grace period
- PR lifecycle **apply** (close/warn) runs only in CI with write-scoped tokens — not from IDE agents
- Do not install Ruflo/MetaHarness in this repo; use Makefile + Cursor hooks + CI

## Key paths

```
policy/pr-lifecycle.yml     Policy thresholds, exemptions, rule precedence
src/                        TypeScript RuleEngine + platform clients
.github/workflows/          GitHub Actions (security, pr-lifecycle)
security/semgrep/           SAST rules
.cursor/hooks/              Dev-time security gates
```

## Security tiers

1. **Local block** — pre-commit gitleaks + Cursor hooks on file edit
2. **CI flag** — Semgrep + CodeQL annotate PRs (non-blocking during rollout)
3. **Lifecycle** — bot PRs with persistent critical findings + inactivity may close; human PRs get `security:review-required` only
