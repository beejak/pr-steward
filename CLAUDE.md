# Claude Code

Import canonical project instructions:

@AGENTS.md

## Optional personal plugins (not repo-required)

Teammates on Claude Code may install:

- **Superpowers**: `/plugin install superpowers@claude-plugins-official` — structured brainstorm → plan → TDD workflow
- **Gstack** (personal): security audits via `/cso`, shipping via `/ship` — patterns also available as Cursor skills in `.cursor/skills/`

## Claude-specific notes

- Use `make` targets from AGENTS.md; do not bypass with raw npm/node when a target exists
- Security-guidance plugin complements repo hooks; both should stay enabled
