# Status

Accepted

# Context

We need a hybrid PR lifecycle system for GitHub and GitLab with deterministic rules, optional agent triage, and tiered security.

# Decision

- TypeScript RuleEngine + platform clients
- Cursor-primary dev harness (Makefile, hooks, skills)
- Dual-runtime docs: `AGENTS.md` canonical, `CLAUDE.md` for Claude Code teammates
- Security: block secrets locally; flag SAST in CI; conservative closure for human PRs

# Consequences

- Phase 0 scaffold in place; Phase 1 adds live API integration
- Ruflo/claude-mem skipped; Superpowers/gstack patterns adapted to Cursor skills
