import type { EvaluationContext, PullRequest } from "../types.js";

export interface AgentTriageInput {
  pr: PullRequest;
  context: EvaluationContext;
}

export interface AgentVerdict {
  prNumber: number;
  verdict: "close" | "warn" | "defer" | "skip";
  confidence: number;
  ruleId: string;
  comment: string;
  source: "cursor" | "heuristic";
}

export const AGENT_CONFIDENCE_THRESHOLD = 0.9;
