import type { EvaluationContext, PolicyConfig, PullRequest, RuleDecision } from "../types.js";
import { EMPTY_CONTEXT } from "../types.js";
import { defaultPolicy } from "../policy/load.js";
import { isSupersededByMergedWork } from "./helpers.js";

const DEFAULT_POLICY: PolicyConfig = defaultPolicy();
const STALE_LABEL = "stale";

function hasExemption(pr: PullRequest, policy: PolicyConfig): boolean {
  return pr.labels.some((l) => policy.exemptionLabels.includes(l));
}

function hasStaleLabel(pr: PullRequest): boolean {
  return pr.labels.includes(STALE_LABEL);
}

export function evaluatePullRequest(
  pr: PullRequest,
  policy: PolicyConfig = DEFAULT_POLICY,
  context: EvaluationContext = EMPTY_CONTEXT,
): RuleDecision {
  if (hasExemption(pr, policy)) {
    return { action: "skip", ruleId: "E1", reason: "Exemption label present", confidence: 1 };
  }

  if (context.duplicatePrNumbers.has(pr.number)) {
    return {
      action: "close",
      ruleId: "C2",
      reason: "Duplicate PR for the same issue (keeping oldest)",
      confidence: 0.95,
    };
  }

  if (context.dependabotSupersededNumbers.has(pr.number)) {
    return {
      action: "close",
      ruleId: "C3",
      reason: "Superseded by newer Dependabot PR for the same dependency",
      confidence: 0.95,
    };
  }

  if (isSupersededByMergedWork(pr, context.mergedPullRequests)) {
    if (pr.isBot) {
      return {
        action: "close",
        ruleId: "C1",
        reason: "Changes already merged via another PR",
        confidence: 0.9,
      };
    }
    return {
      action: "agent_review",
      ruleId: "C6",
      reason: "Ambiguous overlap with merged work — agent triage required",
      confidence: 0.6,
    };
  }

  if (pr.criticalSecurityFinding && !pr.isBot) {
    return {
      action: "warn",
      ruleId: "G3",
      reason: "Critical security finding on human PR — review required",
      confidence: 1,
    };
  }

  if (
    pr.isBot &&
    pr.criticalSecurityFinding &&
    pr.inactiveDays >= policy.thresholds.botSecurityCloseDays
  ) {
    return {
      action: "close",
      ruleId: "G2",
      reason: "Bot PR with persistent critical security finding",
      confidence: 0.95,
    };
  }

  if (pr.isDraft && pr.inactiveDays >= policy.thresholds.draftCloseDays) {
    return {
      action: "close",
      ruleId: "A2",
      reason: "Inactive draft PR",
      confidence: 0.95,
    };
  }

  if (
    (pr.checksFailing || pr.mergeConflict) &&
    pr.inactiveDays >= policy.thresholds.ciFailureCloseDays
  ) {
    return {
      action: "close",
      ruleId: "B3",
      reason: "CI failing or merge conflict with prolonged inactivity",
      confidence: 0.9,
    };
  }

  // Two-phase stale: warn (A3) then close after grace (A3b) — human PRs only
  if (
    !pr.isBot &&
    !pr.isDraft &&
    hasStaleLabel(pr) &&
    pr.inactiveDays >= policy.thresholds.staleWarnDays + policy.thresholds.staleCloseGraceDays
  ) {
    return {
      action: "close",
      ruleId: "A3b",
      reason: "Human PR stale after warning grace period",
      confidence: 0.85,
    };
  }

  if (!pr.isBot && !pr.isDraft && pr.inactiveDays >= policy.thresholds.staleWarnDays) {
    if (hasStaleLabel(pr)) {
      return {
        action: "skip",
        ruleId: "A3",
        reason: "Already warned (stale label present)",
        confidence: 1,
      };
    }
    return {
      action: "warn",
      ruleId: "A3",
      reason: "Human PR stale — warn only",
      confidence: 0.9,
    };
  }

  return { action: "skip", ruleId: "none", reason: "No rule matched", confidence: 1 };
}

export function shouldApplyAction(
  decision: RuleDecision,
  mode: PolicyConfig["rollout"]["mode"],
  pr: PullRequest,
): boolean {
  if (mode === "dry-run") return false;
  if (decision.action === "agent_review" || decision.action === "defer") return false;
  if (mode === "bot-only" && decision.action === "close" && !pr.isBot) return false;
  // A3b human close only in full rollout
  if (mode !== "full" && decision.ruleId === "A3b") return false;
  return decision.action === "close" || decision.action === "warn";
}
