# Phase 3: Agent triage (planned)

Cursor SDK step for `AGENT_REVIEW` queue (rule C6 — ambiguous superseded human PRs).

## Scope

- Run only when `evaluatePullRequest` returns `agent_review` or C6 warn with low confidence
- Structured JSON output: `{ pr, verdict, confidence, rule_id, comment }`
- Hard gate: agent cannot trigger close below 0.9 confidence without deterministic evidence
- CI job uses `CURSOR_API_KEY` secret; classification-only — apply still via RuleEngine

## Not in scope

- Branch deletion after close
- Repository file purging
- Replacing deterministic bot-only closes
