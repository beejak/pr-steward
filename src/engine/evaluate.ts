import type { PolicyConfig, PullRequest, RuleDecision } from "../types.js";

const DEFAULT_POLICY: PolicyConfig = {
  exemptionLabels: ["keep-open", "blocked", "do-not-close", "hold", "wip"],
  thresholds: {
    staleWarnDays: 30,
    staleCloseGraceDays: 7,
    draftCloseDays: 30,
    ciFailureCloseDays: 7,
    botSecurityCloseDays: 7,
  },
  rollout: { mode: "dry-run" },
};

function hasExemption(pr: PullRequest, policy: PolicyConfig): boolean {
  return pr.labels.some((l) => policy.exemptionLabels.includes(l));
}

export function evaluatePullRequest(
  pr: PullRequest,
  policy: PolicyConfig = DEFAULT_POLICY,
): RuleDecision {
  if (hasExemption(pr, policy)) {
    return { action: "skip", ruleId: "E1", reason: "Exemption label present", confidence: 1 };
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

  if (!pr.isBot && !pr.isDraft && pr.inactiveDays >= policy.thresholds.staleWarnDays) {
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
  if (mode === "bot-only" && decision.action === "close" && !pr.isBot) return false;
  return decision.action === "close" || decision.action === "warn";
}
