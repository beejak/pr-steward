import type { PolicyConfig, PullRequest, RuleDecision } from "../types.js";
import { evaluatePullRequest, shouldApplyAction } from "../engine/evaluate.js";
import { buildEvaluationContext } from "../engine/context.js";
import type { PlatformClient } from "../platform/client.js";
import { triagePullRequest, type TriageProvider } from "../agent/triage.js";
import { mergeAgentVerdict, needsAgentTriage } from "../agent/gate.js";
import type { AgentVerdict } from "../agent/types.js";
import {
  aggregateRuleStats,
  buildRunMetadata,
  type RuleStats,
  type RunMetadata,
} from "./metrics.js";

export interface LifecycleResult {
  pr: PullRequest;
  decision: RuleDecision;
  applied: boolean;
  skippedReason?: string;
  agentVerdict?: AgentVerdict;
}

export interface RunSummary {
  mode: PolicyConfig["rollout"]["mode"];
  runMetadata: RunMetadata;
  ruleStats: RuleStats;
  reopenedAfterSteward: number[];
  evaluated: number;
  agentTriaged: number;
  results: LifecycleResult[];
  closuresApplied: number;
  warningsApplied: number;
}

export interface LifecycleRunnerOptions {
  cursorApiKey?: string;
  deepseekApiKey?: string;
  triageProvider?: TriageProvider;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  repository?: string;
}

function labelForDecision(decision: RuleDecision): string | undefined {
  if (decision.ruleId === "A3" || decision.ruleId === "A3b") return "stale";
  if (decision.ruleId === "G3") return "security:review-required";
  if (decision.ruleId === "C1" || decision.ruleId === "C2" || decision.ruleId === "C3" || decision.ruleId === "C6") {
    return "superseded";
  }
  if (decision.action === "close") return "pr-steward:auto-closed";
  return undefined;
}

function commentForDecision(decision: RuleDecision, mode: string): string {
  const prefix = mode === "dry-run" ? "*(dry-run — no action taken)*\n\n" : "";
  return `${prefix}**pr-steward** [${decision.ruleId}]: ${decision.reason}\n\n_Reopen or comment if this was incorrect._`;
}

export class LifecycleRunner {
  private closuresApplied = 0;
  private commentsApplied = 0;
  private agentTriaged = 0;

  constructor(
    private readonly client: PlatformClient,
    private readonly policy: PolicyConfig,
    private readonly options: LifecycleRunnerOptions = {},
  ) {}

  async run(): Promise<RunSummary> {
    const pullRequests = await this.client.listOpenPullRequests();
    const merged = (await this.client.listRecentlyMergedPullRequests?.(90)) ?? [];
    const context = buildEvaluationContext(pullRequests, merged);
    const results: LifecycleResult[] = [];
    const limits = this.policy.limits ?? {
      maxClosuresPerRun: 20,
      maxCommentsPerRun: 30,
    };

    for (const pr of pullRequests) {
      let decision = evaluatePullRequest(pr, this.policy, context);
      let agentVerdict: AgentVerdict | undefined;

      if (needsAgentTriage(decision)) {
        agentVerdict = await triagePullRequest(
          { pr, context },
          {
            cursorApiKey: this.options.cursorApiKey,
            deepseekApiKey: this.options.deepseekApiKey,
            provider: this.options.triageProvider,
            deepseekBaseUrl: this.options.deepseekBaseUrl,
            deepseekModel: this.options.deepseekModel,
            repo: this.options.repository,
          },
        );
        this.agentTriaged += 1;
        decision = mergeAgentVerdict(decision, agentVerdict);
      }

      if (
        this.policy.rollout.mode === "bot-only" &&
        !pr.isBot &&
        decision.action === "close"
      ) {
        decision = {
          ...decision,
          action: "warn",
          reason: `${decision.reason} (warn-only for human PRs in bot-only rollout)`,
        };
      }

      const wouldApply = shouldApplyAction(decision, this.policy.rollout.mode, pr);

      if (!wouldApply) {
        results.push({
          pr,
          decision,
          applied: false,
          agentVerdict,
          skippedReason:
            this.policy.rollout.mode === "dry-run"
              ? "dry-run mode"
              : decision.ruleId === "A3b"
                ? "A3b requires full rollout"
                : "rollout policy",
        });
        continue;
      }

      if (decision.action === "close" && this.closuresApplied >= limits.maxClosuresPerRun) {
        results.push({
          pr,
          decision,
          applied: false,
          agentVerdict,
          skippedReason: "max closures per run",
        });
        continue;
      }

      if (this.commentsApplied >= limits.maxCommentsPerRun) {
        results.push({
          pr,
          decision,
          applied: false,
          agentVerdict,
          skippedReason: "max comments per run",
        });
        continue;
      }

      const comment = commentForDecision(decision, this.policy.rollout.mode);
      const label = labelForDecision(decision);

      if (this.policy.rollout.mode !== "dry-run") {
        if (decision.action === "close") {
          await this.client.closePullRequest(pr.number, comment);
          this.closuresApplied += 1;
          this.commentsApplied += 1;
          if (label) await this.client.addLabel(pr.number, label);
        } else if (decision.action === "warn") {
          await this.client.addComment(pr.number, comment);
          this.commentsApplied += 1;
          if (label) await this.client.addLabel(pr.number, label);
        }
      }

      results.push({
        pr,
        decision,
        applied: this.policy.rollout.mode !== "dry-run",
        agentVerdict,
      });
    }

    const reopenedAfterSteward =
      (await this.client.listReopenedAfterSteward?.()) ?? [];

    const runMetadata = buildRunMetadata({
      repository: this.options.repository ?? "unknown",
      mode: this.policy.rollout.mode,
      triageProvider: this.options.triageProvider ?? "auto",
      timestamp: new Date().toISOString(),
    });

    return {
      mode: this.policy.rollout.mode,
      runMetadata,
      ruleStats: aggregateRuleStats(results),
      reopenedAfterSteward,
      evaluated: pullRequests.length,
      agentTriaged: this.agentTriaged,
      results,
      closuresApplied: this.closuresApplied,
      warningsApplied: results.filter((r) => r.applied && r.decision.action === "warn").length,
    };
  }
}
