# Phase 4: Observability & policy hardening

MVP for audit artifacts, per-rule metrics, reopen tracking, and policy guardrails.

## Scope (MVP)

| Deliverable | Status |
|-------------|--------|
| `ruleStats` in `pr-lifecycle-report.json` | Done |
| `runMetadata` (repo, mode, triage provider, timestamp) | Done |
| GITHUB_STEP_SUMMARY rule stats table | Done |
| Reopen tracking via `pr-steward:auto-closed` label | Done (GitHub) |
| Policy hardening validation on load/run | Done |
| Hermes / dashboard | Phase 4.2 (future) |
| GitLab client | Phase 1 gap (future) |

## Report schema

`pr-lifecycle-report.json` top-level fields:

```json
{
  "runMetadata": {
    "repository": "beejak/pr-steward",
    "mode": "bot-only",
    "triageProvider": "deepseek",
    "timestamp": "2026-06-27T12:00:00.000Z"
  },
  "ruleStats": {
    "B3": { "matched": 1, "applied": 1, "skipped": 0, "agentTriaged": 0 },
    "C6": { "matched": 1, "applied": 0, "skipped": 1, "agentTriaged": 1 }
  },
  "reopenedAfterSteward": [42],
  "evaluated": 5,
  "agentTriaged": 1,
  "closuresApplied": 1,
  "warningsApplied": 0,
  "results": []
}
```

### Per-rule counters

| Field | Meaning |
|-------|---------|
| `matched` | PRs where this ruleId fired |
| `applied` | Close/warn actually executed (non dry-run) |
| `skipped` | Rule matched close/warn but action blocked (rollout, limits, dry-run) |
| `agentTriaged` | Agent triage ran for this rule (C6 today) |

### Reopen / false-positive signal

`reopenedAfterSteward` lists open PR numbers that still carry the `pr-steward:auto-closed` label — a lightweight proxy for “user disagreed with auto-close.”

**Phase 4.1 (future):** correlate reopen events with ruleId from stored report artifacts; compute reopen rate per rule over rolling windows.

## Policy hardening

`validatePolicyHardening()` runs at policy load (errors throw) and at CLI start (warnings log to stderr). Checks include positive limits, sane stale thresholds, and warnings for risky full-rollout configs.

Change thresholds in `policy/pr-lifecycle.yml` before changing closure logic (see AGENTS.md).

## Future: dashboard & Hermes

- Aggregate CI artifacts (`pr-lifecycle-report-*.json`) into a time series
- Reopen rate and false-positive ratio per ruleId
- Optional Hermes integration for cross-repo fleet view — not in MVP

## GitLab

GitLab platform client remains out of scope for Phase 4; metrics schema is platform-agnostic once a GitLab client lands.
