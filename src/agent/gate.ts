import type { PullRequest, RuleDecision } from "../types.js";
import type { AgentVerdict } from "./types.js";
import { AGENT_CONFIDENCE_THRESHOLD } from "./types.js";

export function mergeAgentVerdict(
  base: RuleDecision,
  verdict: AgentVerdict,
  threshold = AGENT_CONFIDENCE_THRESHOLD,
): RuleDecision {
  const reason = verdict.comment || base.reason;

  if (verdict.confidence < threshold) {
    const action =
      verdict.verdict === "skip" || verdict.verdict === "defer" ? "skip" : "warn";
    return {
      action,
      ruleId: base.ruleId,
      reason: `[agent:${verdict.source}] ${reason}`,
      confidence: verdict.confidence,
    };
  }

  if (verdict.verdict === "close") {
    return {
      action: "close",
      ruleId: base.ruleId,
      reason: `[agent:${verdict.source}] ${reason}`,
      confidence: verdict.confidence,
    };
  }

  if (verdict.verdict === "warn") {
    return {
      action: "warn",
      ruleId: base.ruleId,
      reason: `[agent:${verdict.source}] ${reason}`,
      confidence: verdict.confidence,
    };
  }

  return {
    action: "skip",
    ruleId: base.ruleId,
    reason: `[agent:${verdict.source}] ${reason}`,
    confidence: verdict.confidence,
  };
}

export function needsAgentTriage(decision: RuleDecision): boolean {
  return decision.action === "agent_review" || (decision.ruleId === "C6" && decision.confidence < 0.9);
}

export function canAgentCloseHuman(
  decision: RuleDecision,
  pr: PullRequest,
  mode: string,
): boolean {
  return decision.action === "close" && !pr.isBot && mode === "full";
}
