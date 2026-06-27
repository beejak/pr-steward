import type { CuratorContext } from "./types.js";

function makeTable(targets: { name: string; description?: string }[]): string {
  if (targets.length === 0) return "_No targets found._\n";
  const rows = targets.map((t) => `| \`${t.name}\` | ${t.description ?? "—"} |`);
  return ["| Target | Description |", "|--------|-------------|", ...rows].join("\n") + "\n";
}

function npmTable(scripts: { name: string; command: string }[]): string {
  const rows = scripts.map((s) => `| \`npm run ${s.name}\` | \`${s.command}\` |`);
  return ["| Script | Command |", "|--------|---------|", ...rows].join("\n") + "\n";
}

export function generateReadme(ctx: CuratorContext): string {
  return `# ${ctx.repo.name}

${ctx.repo.description}

**Rollout mode:** \`${ctx.policy.rolloutMode}\` (from \`policy/pr-lifecycle.yml\`)

pr-steward is hybrid PR lifecycle automation for GitHub (and GitLab scaffold). Deterministic rules close or warn on stale, superseded, duplicate, and CI-blocked pull requests. Optional agent triage handles ambiguous human overlap (rule C6) — never the sole authority to close human PRs.

## Quick start

\`\`\`bash
npm install
make verify-harness
make test
make check
make pr-lifecycle-dry-run    # local sample PRs, no API
# GITHUB_TOKEN=... make pr-lifecycle-run   # live repo (respects rollout mode)
\`\`\`

### Pre-commit (Tier 1 security)

\`\`\`bash
pip install pre-commit
pre-commit install
\`\`\`

Cursor hooks in \`.cursor/hooks.json\` scan file edits for secrets and run pre-commit on \`git commit\`.

## What it does

| Capability | Detail |
|------------|--------|
| **Close bot PRs** | CI failures, superseded Dependabot bumps, duplicate issues, stale security findings (in \`bot-only\` / \`full\`) |
| **Warn human PRs** | Stale, security review, ambiguous superseded (C6 triage → warn in \`bot-only\`) |
| **Agent triage** | DeepSeek (preferred) → Cursor SDK (optional) → heuristic fallback for C6 |
| **Policy-driven** | Thresholds, exemptions, rollout in \`policy/pr-lifecycle.yml\` |
| **Tiered security** | Block secrets locally; flag SAST in CI; lifecycle labels for findings |

## What it does **not** do

See [docs/what-we-dont-do.md](docs/what-we-dont-do.md). In short: pr-steward **closes pull requests** (labels/comments) — it does **not** delete branches, purge files, or revert merged code.

## Architecture

See [docs/architecture.md](docs/architecture.md) for components, data flow, and mermaid diagrams.

| Layer | Path |
|-------|------|
| Policy | \`policy/pr-lifecycle.yml\` |
| Rule engine | \`src/engine/evaluate.ts\` |
| Agent triage | \`src/agent/\` |
| Orchestrator | \`src/runner/lifecycle.ts\` |
| GitHub client | \`src/platform/github/\` |
| Docs curator | \`src/curator/\` |

## Commands

Full reference: [docs/commands.md](docs/commands.md)

${makeTable(ctx.makeTargets)}

## Rollout modes

| Mode | Behavior |
|------|----------|
| \`dry-run\` | Evaluate only; no API writes |
| \`bot-only\` | **Current** — auto-close/warn bot PRs; human PRs warned only, never closed |
| \`full\` | All rules including human stale close (A3b) after grace period |

Production soak and \`full\` cutover: [docs/production-rollout.md](docs/production-rollout.md).

## Security tiers

1. **Local block** — pre-commit gitleaks + Cursor hooks on file edit
2. **CI flag** — Semgrep + CodeQL annotate PRs (non-blocking during rollout)
3. **Lifecycle** — bot PRs with persistent critical findings + inactivity may close; human PRs get \`security:review-required\` only

## Agent triage

See [docs/phase3-agent-triage.md](docs/phase3-agent-triage.md).

| Provider | When |
|----------|------|
| \`deepseek\` | \`DEEPSEEK_API_KEY\` set (preferred) |
| \`cursor\` | \`CURSOR_API_KEY\` + \`@cursor/sdk\` |
| \`heuristic\` | File-overlap fallback |
| \`auto\` | DeepSeek → Cursor → heuristic |

## agentwatch sandbox

Live fixture repo: [beejak/agentwatch](https://github.com/beejak/agentwatch). See [docs/agentwatch-fixture.md](docs/agentwatch-fixture.md).

## Help & troubleshooting

[docs/help.md](docs/help.md) — secrets, env vars, rollout FAQ, local vs CI.

## Documentation curation

Regenerate docs from repo facts:

\`\`\`bash
make docs-curate              # templates (deterministic)
DEEPSEEK_API_KEY=... make docs-curate-agent   # optional LLM polish
\`\`\`

Snapshot: \`docs/.curator-context.json\` (generated).

## More docs

- [AGENTS.md](AGENTS.md) — canonical agent instructions
- [docs/adr/0001-pr-lifecycle-architecture.md](docs/adr/0001-pr-lifecycle-architecture.md)
- [docs/phase3-agent-triage.md](docs/phase3-agent-triage.md)
- [docs/agentwatch-fixture.md](docs/agentwatch-fixture.md)
- [docs/production-rollout.md](docs/production-rollout.md)

---
_Auto-curated sections sync with \`make docs-curate\`. Last context: ${ctx.generatedAt}._
`;
}

export function generateArchitecture(ctx: CuratorContext): string {
  return `# Architecture

pr-steward evaluates open pull requests against \`policy/pr-lifecycle.yml\`, optionally triages ambiguous cases with an LLM, and applies close/warn actions via platform APIs (CI only for writes).

## Tech stack

${ctx.techStack.map((t) => `- ${t}`).join("\n")}

## Component diagram

\`\`\`mermaid
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
\`\`\`

## Data flow

\`\`\`mermaid
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
\`\`\`

## Source modules

| Module | Role |
|--------|------|
${ctx.sourceModules.map((m) => `| \`src/${m}/\` | ${moduleDescription(m)} |`).join("\n")}

## CI workflows

| Workflow | Triggers |
|----------|----------|
${ctx.workflows.map((w) => `| \`${w.file}\` (${w.name}) | ${w.triggers.join(", ") || "—"} |`).join("\n")}

## Policy snapshot

- **Rollout:** \`${ctx.policy.rolloutMode}\`
- **Rules:** ${ctx.policy.ruleIds.join(", ")}
- **Exemption labels:** ${ctx.policy.exemptionLabels.map((l) => `\`${l}\``).join(", ")}

## Security architecture

\`\`\`mermaid
flowchart LR
  T1[Tier 1: gitleaks + hooks] -->|block commit| DEV[Developer]
  T2[Tier 2: Semgrep + CodeQL] -->|annotate PR| CI[CI]
  T3[Tier 3: lifecycle rules] -->|G2/G3 labels| PR[Pull requests]
\`\`\`

## Docs curator

\`src/curator/\` scans the repo (Makefile, package.json, policy, workflows) → \`docs/.curator-context.json\` → template markdown. Optional DeepSeek pass when \`DEEPSEEK_API_KEY\` is set.

---
_Context: ${ctx.generatedAt}_
`;
}

function moduleDescription(name: string): string {
  const map: Record<string, string> = {
    agent: "Heuristic + DeepSeek + Cursor triage for C6",
    cli: "dry-run, run, curate-docs entrypoints",
    curator: "Documentation snapshot and generation",
    engine: "Rule evaluation and evaluation context",
    fixtures: "Sample PR data for dry-run",
    platform: "GitHub/GitLab clients and normalizers",
    policy: "YAML policy loader",
    runner: "Lifecycle orchestrator",
  };
  return map[name] ?? "Supporting code";
}

export function generateCommands(ctx: CuratorContext): string {
  return `# Commands reference

Prefer **Makefile targets** over raw npm scripts (see [AGENTS.md](../AGENTS.md)).

## Make targets

${makeTable(ctx.makeTargets)}

## npm scripts

${npmTable(ctx.npmScripts)}

## CLI entrypoints

| Command | Purpose |
|---------|---------|
| \`npm run pr-lifecycle:dry-run\` | Evaluate built-in sample PRs locally |
| \`npm run pr-lifecycle:run\` | Evaluate open PRs via GitHub API; writes \`pr-lifecycle-report.json\` |
| \`npm run docs:curate\` | Regenerate documentation from repo snapshot |

### pr-lifecycle:run environment

| Variable | Required | Description |
|----------|----------|-------------|
| \`GITHUB_TOKEN\` / \`GH_TOKEN\` | Yes | PAT or Actions token with PR write (CI) |
| \`PR_STEWARD_TARGET_REPO\` | No | \`owner/repo\` override (default: \`beejak/pr-steward\`) |
| \`PR_STEWARD_TRIAGE_PROVIDER\` | No | \`auto\` \\| \`deepseek\` \\| \`cursor\` \\| \`heuristic\` |
| \`DEEPSEEK_API_KEY\` | No | Agent triage via DeepSeek |
| \`CURSOR_API_KEY\` | No | Agent triage via Cursor SDK |

### docs:curate flags

\`\`\`bash
npm run docs:curate -- [--dry-run] [--agent] [--context-only]
\`\`\`

| Flag | Effect |
|------|--------|
| \`--dry-run\` | Print paths that would be written |
| \`--agent\` | Use DeepSeek to polish README (requires \`DEEPSEEK_API_KEY\`) |
| \`--context-only\` | Write \`docs/.curator-context.json\` only |

## Typical workflows

\`\`\`bash
# Local development
make install && make check && make test

# Policy tuning (no API writes in dry-run mode)
make pr-lifecycle-dry-run

# Live evaluation (respects policy rollout mode: ${ctx.policy.rolloutMode})
GITHUB_TOKEN=ghp_... make pr-lifecycle-run

# Regenerate docs
make docs-curate
\`\`\`

---
_Context: ${ctx.generatedAt}_
`;
}

export function generateHelp(ctx: CuratorContext): string {
  return `# Help & troubleshooting

## FAQ

### Which rollout mode is active?

**\`${ctx.policy.rolloutMode}\`** — read from \`policy/pr-lifecycle.yml\` → \`rollout.mode\`. Change policy before changing closure behavior in code.

### Will pr-steward delete my branches or files?

No. It closes pull requests and may add labels/comments. Branches remain unless you delete them or use GitHub's "delete branch on merge" setting. See [what-we-dont-do.md](what-we-dont-do.md).

### Can I run apply (close/warn) from my laptop?

Technically yes with \`make pr-lifecycle-run\` and a write-scoped token, but **AGENTS.md** recommends apply only in CI. Local runs should use \`dry-run\` policy or the dry-run CLI.

### How do I test against a sandbox repo?

Use [agentwatch-fixture.md](agentwatch-fixture.md): workflow dispatch with \`target_repo: beejak/agentwatch\` and \`AGENTWATCH_TOKEN\` secret.

### When can we switch to \`full\` rollout on pr-steward?

See [production-rollout.md](production-rollout.md) — weekly monitoring on \`beejak/pr-steward\` in \`bot-only\`, checklist (2 weeks clean runs, zero reopens, team sign-off), and rollback steps. agentwatch is sandbox only.

### Agent triage returns heuristic only

1. Set \`DEEPSEEK_API_KEY\` (preferred) or \`CURSOR_API_KEY\`
2. Set \`PR_STEWARD_TRIAGE_PROVIDER=deepseek\` to force provider
3. Check API errors in CI logs (failures fall back to heuristic)

## Environment variables

From \`.env.example\`:

${ctx.envVars.map((v) => `- \`${v}\``).join("\n")}

Copy \`.env.example\` → \`.env\` for local use (never commit secrets).

## Secrets for CI

| Secret | Workflow | Purpose |
|--------|----------|---------|
| \`GITHUB_TOKEN\` | PR Lifecycle | Auto-provided; write on same repo |
| \`AGENTWATCH_TOKEN\` | PR Lifecycle | Cross-repo PAT for \`beejak/agentwatch\` |
| \`DEEPSEEK_API_KEY\` | PR Lifecycle | C6 triage |
| \`CURSOR_API_KEY\` | PR Lifecycle | Optional Cursor triage |

## Rollout mode reference

| Mode | Bot close | Human close | Human warn |
|------|-----------|-------------|------------|
| \`dry-run\` | Simulated | Simulated | Simulated |
| \`bot-only\` | Applied | Never | Applied |
| \`full\` | Applied | After stale grace | Applied |

## Rule quick reference

| Rule | Typical action | Notes |
|------|----------------|-------|
| E1 | skip | Exemption labels |
| A2 | close (bot) | Stale draft bots |
| B3 | close | CI/conflict + inactive |
| C3 | close (bot) | Superseded Dependabot |
| G2 | close (bot) | Security + inactive |
| G3 | warn | Human security |
| A3 | warn | Human stale |
| C6 | agent_review | Ambiguous human overlap |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No PRs evaluated | Token scope; repo has open PRs |
| All SKIPPED | Rollout \`dry-run\` or \`shouldApplyAction\` blocked human close |
| Harness fails | \`make verify-harness\` — missing scaffold files |
| Type errors | \`make check\` |

## Getting help

- Policy changes: edit \`policy/pr-lifecycle.yml\` first
- Agent boundaries: [AGENTS.md](../AGENTS.md)
- Architecture: [architecture.md](architecture.md)

---
_Context: ${ctx.generatedAt}_
`;
}

export function generateWhatWeDontDo(ctx: CuratorContext): string {
  return `# What pr-steward does **not** do

Explicit non-goals and boundaries. pr-steward **acts on pull requests** — it does not manage repository content beyond PR state.

## Repository content

| Not supported | Detail |
|---------------|--------|
| **Delete files or folders** | No code purge, no revert of merged commits |
| **Remove merged code from \`main\`** | Closing a PR does not change default branch history |
| **Branch deletion** | Branches stay after close unless you delete manually or use GitHub merge settings |

Closing a stale Dependabot PR only removes it from the open-PR queue — it does not undo anything already merged.

## Authority boundaries

| Not supported | Detail |
|---------------|--------|
| **Sole agent authority on human closes** | C6 triage requires 0.9 confidence; \`bot-only\` downgrades human closes to warn |
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
- Add labels (\`stale\`, \`superseded\`, \`security:review-required\`, etc.)
- Post explanatory comments
- Emit \`pr-lifecycle-report.json\` for auditing

Current rollout: **\`${ctx.policy.rolloutMode}\`**.

---
_Context: ${ctx.generatedAt}_
`;
}

export interface GeneratedDocs {
  "README.md": string;
  "docs/architecture.md": string;
  "docs/commands.md": string;
  "docs/help.md": string;
  "docs/what-we-dont-do.md": string;
}

export function generateAllDocs(ctx: CuratorContext): GeneratedDocs {
  return {
    "README.md": generateReadme(ctx),
    "docs/architecture.md": generateArchitecture(ctx),
    "docs/commands.md": generateCommands(ctx),
    "docs/help.md": generateHelp(ctx),
    "docs/what-we-dont-do.md": generateWhatWeDontDo(ctx),
  };
}
