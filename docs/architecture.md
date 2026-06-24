# Architecture

pr-steward evaluates open pull requests against `policy/pr-lifecycle.yml`, optionally triages ambiguous cases with an LLM, and applies close/warn actions via platform APIs (CI only for writes).

## Tech stack

- TypeScript (Node.js ≥20, ESM)
- Vitest
- YAML policy (`policy/pr-lifecycle.yml`)
- GitHub Actions + GitLab CI scaffold
- Gitleaks + Semgrep + CodeQL (tiered security)
- DeepSeek API (agent triage, optional)
- Cursor SDK (agent triage, optional)

## Component diagram

```mermaid
flowchart TB
  subgraph inputs [Inputs]
    POLICY[policy/pr-lifecycle.yml]
    API[GitHub/GitLab API]
  end

  subgraph engine [Rule engine]
    LOAD[src/policy/load.ts]
    CTX[src/engine/context.ts]
    EVAL[src/engine/evaluate.ts]
  end

  subgraph agent [Agent triage - C6 only]
    TRIAGE[src/agent/triage.ts]
    DS[DeepSeek API]
    CUR[Cursor SDK]
    HEU[heuristic]
  end

  subgraph runner [Orchestrator]
    LIFE[src/runner/lifecycle.ts]
    GATE[src/agent/gate.ts]
  end

  subgraph outputs [Outputs]
    CLOSE[Close PR]
    WARN[Label + comment]
    SKIP[No action]
  end

  POLICY --> LOAD
  API --> LIFE
  LOAD --> EVAL
  CTX --> EVAL
  EVAL -->|agent_review| TRIAGE
  TRIAGE --> DS
  TRIAGE --> CUR
  TRIAGE --> HEU
  TRIAGE --> GATE
  GATE --> LIFE
  EVAL --> LIFE
  LIFE --> CLOSE
  LIFE --> WARN
  LIFE --> SKIP
```

## Data flow

```mermaid
sequenceDiagram
  participant CI as GitHub Actions
  participant Run as pr-lifecycle:run
  participant GH as GitHub API
  participant Eng as RuleEngine
  participant Ag as Agent triage

  CI->>Run: GITHUB_TOKEN + policy checkout
  Run->>GH: list open PRs + recent merges
  loop each PR
    Run->>Eng: evaluatePullRequest
    alt C6 agent_review
      Run->>Ag: triagePullRequest
      Ag-->>Run: verdict + confidence
      Run->>Eng: mergeAgentVerdict (0.9 gate)
    end
    Run->>Run: shouldApplyAction (rollout mode)
    opt apply in bot-only/full
      Run->>GH: close / label / comment
    end
  end
  Run-->>CI: pr-lifecycle-report.json
```

## Source modules

| Module | Role |
|--------|------|
| `src/agent/` | Heuristic + DeepSeek + Cursor triage for C6 |
| `src/cli/` | dry-run, run, curate-docs entrypoints |
| `src/curator/` | Documentation snapshot and generation |
| `src/engine/` | Rule evaluation and evaluation context |
| `src/fixtures/` | Sample PR data for dry-run |
| `src/platform/` | GitHub/GitLab clients and normalizers |
| `src/policy/` | YAML policy loader |
| `src/runner/` | Lifecycle orchestrator |

## CI workflows

| Workflow | Triggers |
|----------|----------|
| `ci.yml` (CI) | pull_request, push |
| `docs-curate.yml` (Docs Curate) | schedule, workflow_dispatch |
| `pr-lifecycle.yml` (PR Lifecycle) | schedule, workflow_dispatch |
| `security.yml` (Security) | workflow_dispatch, pull_request, push |

## Policy snapshot

- **Rollout:** `bot-only`
- **Rules:** E1, A2, C3, B3, G2, G3, A3, C6
- **Exemption labels:** `keep-open`, `blocked`, `do-not-close`, `hold`, `wip`

## Security architecture

```mermaid
flowchart LR
  T1[Tier 1: gitleaks + hooks] -->|block commit| DEV[Developer]
  T2[Tier 2: Semgrep + CodeQL] -->|annotate PR| CI[CI]
  T3[Tier 3: lifecycle rules] -->|G2/G3 labels| PR[Pull requests]
```

## Docs curator

`src/curator/` scans the repo (Makefile, package.json, policy, workflows) → `docs/.curator-context.json` → template markdown. Optional DeepSeek pass when `DEEPSEEK_API_KEY` is set.

---
_Context: 2026-06-24T06:21:53.669Z_
