# Production rollout playbook

pr-steward dogfoods on **beejak/pr-steward** (this repo). The **agentwatch** fixture repo remains a sandbox for C6 and cross-repo testing — not the production target.

## Current state

| Setting | Value |
|---------|-------|
| Production repo | `beejak/pr-steward` |
| Rollout mode | `bot-only` (`policy/pr-lifecycle.yml` → `rollout.mode`) |
| Schedule | Weekdays 09:00 UTC (`.github/workflows/pr-lifecycle.yml`) |
| Human PR closes | **Never** in `bot-only` — warn only |
| Bot PR closes | Applied per policy (B3, C3, G2, A2, etc.) |
| Sandbox | `beejak/agentwatch` — fixture PRs only |

In `bot-only`, the rule engine may match human-close rules (e.g. A3 stale grace) but `shouldApplyAction` blocks execution. C6 agent triage downgrades ambiguous human overlap to warn, not close.

## Weekly monitoring

Review each scheduled run (or the latest workflow dispatch artifact). Focus on three signals:

### 1. `ruleStats`

Per-rule counters in `pr-lifecycle-report.json` (and the GITHUB_STEP_SUMMARY table):

| Field | Watch for |
|-------|-----------|
| `matched` | Unexpected spikes — new rule firing on many PRs |
| `applied` | Closures/warns actually executed |
| `skipped` | High skip rate on rules you expect to apply (rollout gate, limits) |
| `agentTriaged` | C6 volume; sudden jumps may need policy tuning |

Healthy bot-only runs on pr-steward typically show low `applied` counts (few open bot PRs) and zero human closes.

### 2. `reopenedAfterSteward`

Open PR numbers that still carry the `pr-steward:auto-closed` label. This is a lightweight false-positive proxy: someone reopened a PR pr-steward closed.

**Target during bot-only soak:** `reopenedAfterSteward` is empty every week. Any non-empty list warrants investigation before `full` rollout.

### 3. False positives (qualitative)

Beyond reopen tracking, scan applied actions in the report `results` array:

- Bot PR closed incorrectly (superseded logic, CI flake, security label stale)
- Warn labels on human PRs that should stay quiet (stale threshold too aggressive)
- C6 triage verdicts that disagree with maintainer intent

Log issues in GitHub issues with ruleId and PR number for trend review.

## Reading `pr-lifecycle-report.json`

Artifact name: `pr-lifecycle-report-<run_id>` (uploaded by the PR Lifecycle workflow).

Top-level fields:

```json
{
  "runMetadata": {
    "repository": "beejak/pr-steward",
    "mode": "bot-only",
    "triageProvider": "auto",
    "timestamp": "2026-06-27T09:00:00.000Z"
  },
  "evaluated": 3,
  "agentTriaged": 0,
  "closuresApplied": 0,
  "warningsApplied": 1,
  "ruleStats": {
    "A3": { "matched": 1, "applied": 1, "skipped": 0, "agentTriaged": 0 }
  },
  "reopenedAfterSteward": [],
  "results": []
}
```

Each `results[]` entry includes PR metadata, `decision` (ruleId, action), `applied`, and optional `skippedReason`.

Download from a workflow run: **Actions → PR Lifecycle → run → Artifacts → pr-lifecycle-report-***.

See also [phase4-observability.md](phase4-observability.md) for schema detail.

## Reading GITHUB_STEP_SUMMARY

The CLI writes a markdown summary when `GITHUB_STEP_SUMMARY` is set (CI only). On the workflow run page, open **Summary** to see:

- Repository, mode, triage provider, timestamp
- Evaluated / agent triaged / applied counts
- **Reopened after steward** count
- Rule stats table (same data as `ruleStats`)
- Table of PRs that matched close/warn with APPLIED vs SKIPPED status

Use Summary for quick weekly checks; download the JSON artifact for audit retention.

## Criteria before switching to `full`

Complete **all** items before changing `rollout.mode` to `full`:

- [ ] **Two weeks** of consecutive scheduled runs on `beejak/pr-steward` with no workflow failures
- [ ] **`reopenedAfterSteward` empty** on every run in that window
- [ ] **Zero unexpected bot closes** — no maintainer complaints or manual reopens without `keep-open` / exemption labels
- [ ] **`ruleStats` stable** — no unexplained spikes in `applied` or new ruleIds firing at scale
- [ ] **C6 triage reviewed** — agent/heuristic verdicts align with team expectations when C6 matches
- [ ] **Team sign-off** — explicit approval from repo maintainers to enable human stale close (A3 grace → close)
- [ ] **Rollback plan acknowledged** — see below; revert PR ready before merge

`full` enables human PR close after stale warning + grace period. This is irreversible for affected PRs until someone reopens them — treat the switch as a production change.

## Switch to `full` rollout

1. Open a PR that **only** changes policy (plus this doc update if needed).
2. Edit `policy/pr-lifecycle.yml`:

   ```yaml
   rollout:
     mode: full  # dry-run | bot-only | full
   ```

3. Run locally: `make check && make test && make verify-harness`
4. Merge the PR; the next scheduled PR Lifecycle run (or a manual dispatch) applies under `full`.
5. Monitor the **first three** `full` runs daily — not weekly — using the same signals above.

Optional: trigger an immediate validation run after merge:

```bash
gh workflow run pr-lifecycle.yml \
  --repo beejak/pr-steward \
  -f target_repo=beejak/pr-steward \
  -f triage_provider=auto
```

## Rollback to `bot-only`

If false positives, unexpected human closes, or reopen spikes occur after `full`:

1. Revert or PR a policy change setting `rollout.mode: bot-only` again.
2. Merge urgently; subsequent runs stop applying human closes.
3. Reopen any PRs closed in error (pr-steward does not auto-reopen).
4. File a post-incident issue: ruleId, PR numbers, `reopenedAfterSteward` data, and proposed threshold/policy fix.

Rollback is a one-line policy revert — no code deploy beyond merging the YAML change.

## Repo roles

| Repo | Role |
|------|------|
| **beejak/pr-steward** | Production — scheduled lifecycle, real maintainer PRs |
| **beejak/agentwatch** | Sandbox — C6 fixtures, cross-repo PAT testing, disposable PRs |

Do not use agentwatch metrics as the gate for production `full` rollout. Soak period metrics must come from pr-steward runs only.

## Related docs

- [phase4-observability.md](phase4-observability.md) — report schema and metrics
- [help.md](help.md) — rollout FAQ and env vars
- [agentwatch-fixture.md](agentwatch-fixture.md) — sandbox usage
- [AGENTS.md](../AGENTS.md) — agent boundaries (apply in CI only)
