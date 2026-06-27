# What pr-steward does **not** do

Explicit non-goals and boundaries. pr-steward **acts on pull requests** — it does not manage repository content beyond PR state.

## Repository content

| Not supported | Detail |
|---------------|--------|
| **Delete files or folders** | No code purge, no revert of merged commits |
| **Remove merged code from `main`** | Closing a PR does not change default branch history |
| **Branch deletion** | Branches stay after close unless you delete manually or use GitHub merge settings |

Closing a stale Dependabot PR only removes it from the open-PR queue — it does not undo anything already merged.

## Authority boundaries

| Not supported | Detail |
|---------------|--------|
| **Sole agent authority on human closes** | C6 triage requires 0.9 confidence; `bot-only` downgrades human closes to warn |
| **IDE agent apply** | Close/warn apply intended for CI with write tokens ([AGENTS.md](../AGENTS.md)) |
| **Replace all deterministic rules** | Bots still use C1/C2/C3/B3/G2 without LLM |

## Integrations we skip

| Not integrated | Detail |
|----------------|--------|
| **WatchTower Python library** | [agentwatch](https://github.com/beejak/agentwatch) is a fixture sandbox only |
| **Chronicle / Redis / ClickHouse** | No ingestion pipeline in pr-steward |
| **Ruflo / MetaHarness** | Use Makefile + Cursor hooks + CI instead |

## What pr-steward **does** do

- Close or warn pull requests per policy
- Add labels (`stale`, `superseded`, `security:review-required`, etc.)
- Post explanatory comments
- Emit `pr-lifecycle-report.json` for auditing

Current rollout: **`bot-only`**.

---
_Context: 2026-06-27T05:41:48.266Z_
