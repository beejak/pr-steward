import type { PolicyConfig, PullRequest, RuleDecision } from "../types.js";
import { evaluatePullRequest, shouldApplyAction } from "../engine/evaluate.js";
import type { PlatformClient } from "../platform/client.js";

export interface LifecycleResult {
  pr: PullRequest;
  decision: RuleDecision;
  applied: boolean;
  skippedReason?: string;
}

export interface RunSummary {
  mode: PolicyConfig["rollout"]["mode"];
  evaluated: number;
  results: LifecycleResult[];
  closuresApplied: number;
  warningsApplied: number;
}

function labelForDecision(decision: RuleDecision): string | undefined {
  if (decision.ruleId === "A3") return "stale";
  if (decision.ruleId === "G3") return "security:review-required";
  if (decision.action === "close") return "pr-steward:auto-closed";
  return undefined;
}

function commentForDecision(decision: RuleDecision, mode: string): string {
  const prefix =
    mode === "dry-run"
      ? "*(dry-run — no action taken)*\n\n"
      : "";
  return `${prefix}**pr-steward** [${decision.ruleId}]: ${decision.reason}\n\n_Reopen or comment if this was incorrect._`;
}

export class LifecycleRunner {
  private closuresApplied = 0;
  private commentsApplied = 0;

  constructor(
    private readonly client: PlatformClient,
    private readonly policy: PolicyConfig,
  ) {}

  async run(): Promise<RunSummary> {
    const pullRequests = await this.client.listOpenPullRequests();
    const results: LifecycleResult[] = [];
    const limits = this.policy.limits ?? {
      maxClosuresPerRun: 20,
      maxCommentsPerRun: 30,
    };

    for (const pr of pullRequests) {
      const decision = evaluatePullRequest(pr, this.policy);
      const wouldApply = shouldApplyAction(decision, this.policy.rollout.mode, pr);

      if (!wouldApply) {
        results.push({
          pr,
          decision,
          applied: false,
          skippedReason:
            this.policy.rollout.mode === "dry-run"
              ? "dry-run mode"
              : "rollout policy",
        });
        continue;
      }

      if (
        decision.action === "close" &&
        this.closuresApplied >= limits.maxClosuresPerRun
      ) {
        results.push({
          pr,
          decision,
          applied: false,
          skippedReason: "max closures per run",
        });
        continue;
      }

      if (this.commentsApplied >= limits.maxCommentsPerRun) {
        results.push({
          pr,
          decision,
          applied: false,
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
        } else if (decision.action === "warn") {
          await this.client.addComment(pr.number, comment);
          this.commentsApplied += 1;
          if (label) await this.client.addLabel(pr.number, label);
        }
      }

      results.push({ pr, decision, applied: this.policy.rollout.mode !== "dry-run" });
    }

    return {
      mode: this.policy.rollout.mode,
      evaluated: pullRequests.length,
      results,
      closuresApplied: this.closuresApplied,
      warningsApplied: results.filter(
        (r) => r.applied && r.decision.action === "warn",
      ).length,
    };
  }
}
